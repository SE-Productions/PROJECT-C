// Schema Sync — Auto-creates tables on boot using PostgreSQL
// Uses Drizzle's $client for raw SQL execution

import { getDb } from "../queries/connection";

async function tableExists(db: any, tableName: string): Promise<boolean> {
  try {
    const client = db.$client;
    const result = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
      [tableName]
    );
    return result.rows.length > 0;
  } catch (err: any) {
    console.error(`[SchemaSync] tableExists(${tableName}) error:`, err.message);
    return false;
  }
}

async function createTable(db: any, sql: string, tableName: string): Promise<boolean> {
  try {
    const client = db.$client;
    await client.query(sql);
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

  console.log("[SchemaSync] Starting schema sync using PostgreSQL...");

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
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(255) NOT NULL,
        description TEXT,
        genre VARCHAR(100),
        cover_image VARCHAR(1000),
        target_audience VARCHAR(255),
        publish_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'draft' NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: "campaigns",
      sql: `CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        book_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        objective VARCHAR(50) DEFAULT 'awareness',
        status VARCHAR(50) DEFAULT 'draft' NOT NULL,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        platforms JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: "posts",
      sql: `CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER,
        book_id INTEGER NOT NULL,
        platform VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        media_urls JSONB,
        scheduled_at TIMESTAMP,
        published_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'draft' NOT NULL,
        composio_action_id VARCHAR(255),
        analytics JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: "media_assets",
      sql: `CREATE TABLE IF NOT EXISTS media_assets (
        id SERIAL PRIMARY KEY,
        book_id INTEGER,
        campaign_id INTEGER,
        type VARCHAR(50) NOT NULL,
        prompt TEXT,
        url VARCHAR(1000) DEFAULT 'pending' NOT NULL,
        thumbnail_url VARCHAR(1000),
        platform VARCHAR(50),
        status VARCHAR(50) DEFAULT 'generating' NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: "agent_messages",
      sql: `CREATE TABLE IF NOT EXISTS agent_messages (
        id SERIAL PRIMARY KEY,
        agent_type VARCHAR(50) NOT NULL,
        book_id INTEGER,
        role VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: "agent_tasks",
      sql: `CREATE TABLE IF NOT EXISTS agent_tasks (
        id SERIAL PRIMARY KEY,
        agent_type VARCHAR(50) NOT NULL,
        book_id INTEGER,
        campaign_id INTEGER,
        task TEXT NOT NULL,
        input JSONB,
        output TEXT,
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        error TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP
      )`,
    },
    {
      name: "cron_jobs",
      sql: `CREATE TABLE IF NOT EXISTS cron_jobs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        agent_type VARCHAR(50) NOT NULL,
        task TEXT NOT NULL,
        schedule VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'active' NOT NULL,
        last_run TIMESTAMP,
        next_run TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: "scratch_pad",
      sql: `CREATE TABLE IF NOT EXISTS scratch_pad (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) NOT NULL,
        value TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'general',
        tags JSONB,
        source VARCHAR(255),
        book_id INTEGER,
        access_count INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: "agent_scratch_pad",
      sql: `CREATE TABLE IF NOT EXISTS agent_scratch_pad (
        id SERIAL PRIMARY KEY,
        agent_type VARCHAR(50) NOT NULL,
        task_id INTEGER,
        book_id INTEGER,
        thought TEXT NOT NULL,
        decision TEXT,
        reasoning TEXT,
        reflection_score REAL,
        is_relevant VARCHAR(50) DEFAULT 'uncertain',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: "reflection_log",
      sql: `CREATE TABLE IF NOT EXISTS reflection_log (
        id SERIAL PRIMARY KEY,
        agent_type VARCHAR(50) NOT NULL,
        task_id INTEGER,
        original_decision TEXT NOT NULL,
        reflection_result TEXT NOT NULL,
        aligned_with_goal VARCHAR(50) NOT NULL,
        correction TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
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
