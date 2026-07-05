// Schema Sync — Auto-creates tables on boot using Drizzle's existing connection
// Uses db.execute() which shares the same pool as all other queries
import { getDb } from "../queries/connection";

/**
 * Check if a table exists using information_schema (via Drizzle execute).
 */
async function tableExists(tableName: string): Promise<boolean> {
  const db = getDb();
  try {
    const result = await db.execute(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${tableName}'`
    );
    const rows = result[0] as unknown as any[];
    return rows.length > 0;
  } catch (err: any) {
    console.error(`[SchemaSync] tableExists(${tableName}) error:`, err.message);
    return false;
  }
}

/**
 * Create a table using raw SQL via Drizzle execute.
 */
async function createTable(sql: string, tableName: string): Promise<boolean> {
  const db = getDb();
  try {
    await db.execute(sql);
    console.log(`[SchemaSync] Created table: ${tableName}`);
    return true;
  } catch (err: any) {
    console.error(`[SchemaSync] createTable(${tableName}) error:`, err.message);
    return false;
  }
}

/**
 * Sync database schema — create all tables if they don't exist.
 * Runs BEFORE server starts (blocking boot).
 */
export async function syncSchema(): Promise<void> {
  console.log("[SchemaSync] Starting schema sync...");

  const created: string[] = [];
  const existing: string[] = [];

  // ─── 1. books ───
  if (await tableExists("books")) {
    existing.push("books");
  } else {
    const ok = await createTable(`CREATE TABLE IF NOT EXISTS books (
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
    )`, "books");
    if (ok) created.push("books");
  }

  // ─── 2. campaigns ───
  if (await tableExists("campaigns")) {
    existing.push("campaigns");
  } else {
    const ok = await createTable(`CREATE TABLE IF NOT EXISTS campaigns (
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
    )`, "campaigns");
    if (ok) created.push("campaigns");
  }

  // ─── 3. posts ───
  if (await tableExists("posts")) {
    existing.push("posts");
  } else {
    const ok = await createTable(`CREATE TABLE IF NOT EXISTS posts (
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
    )`, "posts");
    if (ok) created.push("posts");
  }

  // ─── 4. media_assets ───
  if (await tableExists("media_assets")) {
    existing.push("media_assets");
  } else {
    const ok = await createTable(`CREATE TABLE IF NOT EXISTS media_assets (
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
    )`, "media_assets");
    if (ok) created.push("media_assets");
  }

  // ─── 5. agent_messages ───
  if (await tableExists("agent_messages")) {
    existing.push("agent_messages");
  } else {
    const ok = await createTable(`CREATE TABLE IF NOT EXISTS agent_messages (
      id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
      agent_type enum('planner','search','media','social') NOT NULL,
      book_id bigint unsigned,
      role varchar(20) NOT NULL,
      message text NOT NULL,
      metadata text,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`, "agent_messages");
    if (ok) created.push("agent_messages");
  }

  // ─── 6. agent_tasks ───
  if (await tableExists("agent_tasks")) {
    existing.push("agent_tasks");
  } else {
    const ok = await createTable(`CREATE TABLE IF NOT EXISTS agent_tasks (
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
    )`, "agent_tasks");
    if (ok) created.push("agent_tasks");
  }

  // ─── 7. cron_jobs ───
  if (await tableExists("cron_jobs")) {
    existing.push("cron_jobs");
  } else {
    const ok = await createTable(`CREATE TABLE IF NOT EXISTS cron_jobs (
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
    )`, "cron_jobs");
    if (ok) created.push("cron_jobs");
  }

  // ─── 8. scratch_pad ───
  if (await tableExists("scratch_pad")) {
    existing.push("scratch_pad");
  } else {
    const ok = await createTable(`CREATE TABLE IF NOT EXISTS scratch_pad (
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
    )`, "scratch_pad");
    if (ok) created.push("scratch_pad");
  }

  // ─── 9. agent_scratch_pad ───
  if (await tableExists("agent_scratch_pad")) {
    existing.push("agent_scratch_pad");
  } else {
    const ok = await createTable(`CREATE TABLE IF NOT EXISTS agent_scratch_pad (
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
    )`, "agent_scratch_pad");
    if (ok) created.push("agent_scratch_pad");
  }

  // ─── 10. reflection_log ───
  if (await tableExists("reflection_log")) {
    existing.push("reflection_log");
  } else {
    const ok = await createTable(`CREATE TABLE IF NOT EXISTS reflection_log (
      id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
      agent_type enum('planner','search','media','social') NOT NULL,
      task_id bigint unsigned,
      original_decision text NOT NULL,
      reflection_result text NOT NULL,
      aligned_with_goal enum('yes','no','partial') NOT NULL,
      correction text,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`, "reflection_log");
    if (ok) created.push("reflection_log");
  }

  if (created.length > 0) {
    console.log(`[SchemaSync] Created ${created.length} tables: ${created.join(", ")}`);
  }
  if (existing.length > 0) {
    console.log(`[SchemaSync] ${existing.length} tables already exist: ${existing.join(", ")}`);
  }
  if (created.length === 0 && existing.length === 0) {
    console.log("[SchemaSync] No tables synced (check connection)");
  }
}
