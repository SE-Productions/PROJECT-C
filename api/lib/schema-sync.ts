// Schema Sync — Automatically creates tables on boot if they don't exist
// This ensures the deployed database always matches the code schema
import { getDb } from "../queries/connection";

/**
 * Check if a table exists in the database.
 */
async function tableExists(tableName: string): Promise<boolean> {
  const db = getDb();
  try {
    const result = await db.execute(
      `SELECT 1 FROM ${tableName} LIMIT 1`
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Sync database schema — create tables if they don't exist.
 * Runs automatically on server boot.
 */
export async function syncSchema(): Promise<void> {
  const db = getDb();
  const created: string[] = [];
  const existing: string[] = [];

  // Check and create books table
  if (!(await tableExists("books"))) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS books (
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
      )
    `);
    created.push("books");
  } else {
    existing.push("books");
  }

  // Check and create campaigns table
  if (!(await tableExists("campaigns"))) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS campaigns (
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
      )
    `);
    created.push("campaigns");
  } else {
    existing.push("campaigns");
  }

  // Check and create posts table
  if (!(await tableExists("posts"))) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS posts (
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
      )
    `);
    created.push("posts");
  } else {
    existing.push("posts");
  }

  // Check and create media_assets table
  if (!(await tableExists("media_assets"))) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS media_assets (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        book_id bigint unsigned,
        campaign_id bigint unsigned,
        type varchar(50) NOT NULL,
        prompt text,
        url varchar(1000) NOT NULL DEFAULT '',
        thumbnail_url varchar(1000),
        platform varchar(100),
        status varchar(50) DEFAULT 'generating',
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    created.push("media_assets");
  } else {
    existing.push("media_assets");
  }

  // Check and create agent_messages table
  if (!(await tableExists("agent_messages"))) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS agent_messages (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        agent_type enum('planner','search','media','social') NOT NULL,
        book_id bigint unsigned,
        role varchar(20) NOT NULL,
        message text NOT NULL,
        metadata text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    created.push("agent_messages");
  } else {
    existing.push("agent_messages");
  }

  // Check and create agent_tasks table
  if (!(await tableExists("agent_tasks"))) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS agent_tasks (
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
      )
    `);
    created.push("agent_tasks");
  } else {
    existing.push("agent_tasks");
  }

  // Check and create cron_jobs table
  if (!(await tableExists("cron_jobs"))) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS cron_jobs (
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
      )
    `);
    created.push("cron_jobs");
  } else {
    existing.push("cron_jobs");
  }

  // Check and create scratch_pad table
  if (!(await tableExists("scratch_pad"))) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS scratch_pad (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ${'`'}key${'`'} varchar(255) NOT NULL,
        value text NOT NULL,
        category varchar(100) DEFAULT 'general',
        tags text,
        source varchar(255),
        book_id bigint unsigned,
        access_count bigint DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    created.push("scratch_pad");
  } else {
    existing.push("scratch_pad");
  }

  // Check and create agent_scratch_pad table
  if (!(await tableExists("agent_scratch_pad"))) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS agent_scratch_pad (
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
      )
    `);
    created.push("agent_scratch_pad");
  } else {
    existing.push("agent_scratch_pad");
  }

  // Check and create reflection_log table
  if (!(await tableExists("reflection_log"))) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS reflection_log (
        id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
        agent_type enum('planner','search','media','social') NOT NULL,
        task_id bigint unsigned,
        original_decision text NOT NULL,
        reflection_result text NOT NULL,
        aligned_with_goal enum('yes','no','partial') NOT NULL,
        correction text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    created.push("reflection_log");
  } else {
    existing.push("reflection_log");
  }

  if (created.length > 0) {
    console.log(`[SchemaSync] Created tables: ${created.join(", ")}`);
  }
  if (existing.length > 0) {
    console.log(`[SchemaSync] Existing tables: ${existing.join(", ")}`);
  }
}
