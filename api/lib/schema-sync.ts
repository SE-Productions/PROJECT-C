// Schema Sync — Auto-creates tables on boot using Drizzle's own mysql2 pool
// Uses db.$client.promise() to get promise-based execution
// Includes retry logic for flaky DNS resolution on Render free tier

import { getDb } from "../queries/connection";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

async function withRetry<T>(fn: () => Promise<T>, operation: string): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isDnsError = err.message?.includes("getaddrinfo") || err.message?.includes("ENOTFOUND");
      if (isDnsError && attempt < MAX_RETRIES) {
        console.log(`[SchemaSync] ${operation} failed (DNS, attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function tableExists(db: any, tableName: string): Promise<boolean> {
  try {
    const client = db.$client.promise ? db.$client.promise() : db.$client;
    const [rows] = await withRetry(
      () => client.execute(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
        [tableName]
      ),
      `tableExists(${tableName})`
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch (err: any) {
    console.error(`[SchemaSync] tableExists(${tableName}) error:`, err.message);
    return false;
  }
}

async function createTable(db: any, sql: string, tableName: string): Promise<boolean> {
  try {
    const client = db.$client.promise ? db.$client.promise() : db.$client;
    await withRetry(
      () => client.execute(sql),
      `createTable(${tableName})`
    );
    console.log(`[SchemaSync] Created table: ${tableName}`);
    return true;
  } catch (err: any) {
    console.error(`[SchemaSync] createTable(${tableName}) error:`, err.message);
    return false;
  }
}

/**
 * Sync database schema — create all tables if they don't exist.
 * Runs BEFORE server starts accepting requests.
 */
export async function syncSchema(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("[SchemaSync] DATABASE_URL not set, skipping");
    return;
  }

  console.log("[SchemaSync] Starting schema sync using Drizzle connection...");

  let db: any;
  try {
    db = getDb();
    console.log("[SchemaSync] Drizzle client obtained");
  } catch (err: any) {
    console.error("[SchemaSync] Failed to get Drizzle client:", err.message);
    return;
  }

  const created: string[] = [];
  const existing: string[] = [];

  const tables = [
    {
      name: "books",
      sql: `CREATE TABLE IF NOT EXISTS books (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title varchar(255) NOT NULL,
        author varchar(255) NOT NULL,
        description text,
        genre varchar(100),
        cover_image text,
        target_audience varchar(255),
        publish_date varchar(50),
        status varchar(50) DEFAULT 'draft',
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "campaigns",
      sql: `CREATE TABLE IF NOT EXISTS campaigns (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        book_id bigint unsigned,
        name varchar(255) NOT NULL,
        objective varchar(100) DEFAULT 'awareness',
        platforms text,
        status varchar(50) DEFAULT 'draft',
        start_date timestamp,
        end_date timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "posts",
      sql: `CREATE TABLE IF NOT EXISTS posts (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        book_id bigint unsigned,
        campaign_id bigint unsigned,
        platform varchar(100) NOT NULL,
        content text NOT NULL,
        scheduled_at timestamp,
        published_at timestamp,
        status varchar(50) DEFAULT 'draft',
        metadata text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "media_assets",
      sql: `CREATE TABLE IF NOT EXISTS media_assets (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        book_id bigint unsigned,
        campaign_id bigint unsigned,
        type varchar(50) NOT NULL,
        prompt text,
        url varchar(1000) NOT NULL DEFAULT 'pending',
        thumbnail_url varchar(1000),
        platform varchar(100),
        status varchar(50) DEFAULT 'generating',
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "agent_messages",
      sql: `CREATE TABLE IF NOT EXISTS agent_messages (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        agent_type enum('planner','search','media','social') NOT NULL,
        book_id bigint unsigned,
        role varchar(20) NOT NULL,
        message text NOT NULL,
        metadata text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "agent_tasks",
      sql: `CREATE TABLE IF NOT EXISTS agent_tasks (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        agent_type enum('planner','search','media','social') NOT NULL,
        book_id bigint unsigned,
        task text NOT NULL,
        status varchar(50) DEFAULT 'running',
        input text,
        output text,
        error text,
        completed_at timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "cron_jobs",
      sql: `CREATE TABLE IF NOT EXISTS cron_jobs (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name varchar(255) NOT NULL,
        description text,
        agent_type enum('planner','search','media','social') NOT NULL,
        task text NOT NULL,
        schedule varchar(100) NOT NULL,
        status varchar(50) DEFAULT 'active',
        last_run timestamp,
        next_run timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "scratch_pad",
      sql: `CREATE TABLE IF NOT EXISTS scratch_pad (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`key\` varchar(255) NOT NULL,
        value text NOT NULL,
        category varchar(100) DEFAULT 'general',
        tags text,
        source varchar(255),
        book_id bigint unsigned,
        access_count bigint DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "agent_scratch_pad",
      sql: `CREATE TABLE IF NOT EXISTS agent_scratch_pad (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        agent_type enum('planner','search','media','social') NOT NULL,
        task_id bigint unsigned,
        book_id bigint unsigned,
        thought text NOT NULL,
        decision text,
        reasoning text,
        reflection_score float,
        is_relevant enum('yes','no','uncertain') DEFAULT 'uncertain',
        status varchar(50) DEFAULT 'active',
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "reflection_log",
      sql: `CREATE TABLE IF NOT EXISTS reflection_log (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        agent_type enum('planner','search','media','social') NOT NULL,
        task_id bigint unsigned,
        original_decision text NOT NULL,
        reflection_result text NOT NULL,
        aligned_with_goal enum('yes','no','partial') NOT NULL,
        correction text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
  ];

  for (const { name, sql } of tables) {
    if (await tableExists(db, name)) {
      existing.push(name);
    } else {
      const ok = await createTable(db, sql, name);
      if (ok) created.push(name);
    }
  }

  if (created.length > 0) {
    console.log(`[SchemaSync] Created ${created.length} tables: ${created.join(", ")}`);
  }
  if (existing.length > 0) {
    console.log(`[SchemaSync] ${existing.length} tables already exist: ${existing.join(", ")}`);
  }
  if (created.length === 0 && existing.length === 0) {
    console.log("[SchemaSync] No tables synced — check logs above for errors");
  }
}
