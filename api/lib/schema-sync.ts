// Schema Sync — Automatically creates tables on boot if they don't exist
// Uses raw mysql2 driver for CREATE TABLE operations (more reliable than Drizzle execute)
import { createConnection, type ConnectionOptions } from "mysql2/promise";
import { parse } from "url";

const DATABASE_URL = process.env.DATABASE_URL;

function parseDbUrl(url: string): ConnectionOptions {
  const parsed = parse(url, true);
  const auth = parsed.auth?.split(":") ?? ["", ""];
  return {
    host: parsed.hostname ?? undefined,
    port: parsed.port ? parseInt(parsed.port) : undefined,
    user: auth[0] || undefined,
    password: auth[1] || undefined,
    database: parsed.pathname?.replace(/^\//, "") || undefined,
    ssl: { rejectUnauthorized: false },
  };
}

async function getRawConnection() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL not set");
  const opts = parseDbUrl(DATABASE_URL);
  return createConnection(opts);
}

async function tableExists(conn: any, tableName: string): Promise<boolean> {
  try {
    const [rows] = await conn.execute(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
      [tableName]
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Sync database schema — create tables if they don't exist.
 * Runs BEFORE server starts accepting requests (blocking boot).
 */
export async function syncSchema(): Promise<void> {
  if (!DATABASE_URL) {
    console.warn("[SchemaSync] DATABASE_URL not set, skipping");
    return;
  }

  let conn;
  try {
    conn = await getRawConnection();
    console.log("[SchemaSync] Connected to database");
  } catch (err: any) {
    console.error("[SchemaSync] Failed to connect:", err.message);
    return;
  }

  const created: string[] = [];
  const existing: string[] = [];

  // ─── 1. books ───
  if (!(await tableExists(conn, "books"))) {
    await conn.execute(`
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
  } else { existing.push("books"); }

  // ─── 2. campaigns ───
  if (!(await tableExists(conn, "campaigns"))) {
    await conn.execute(`
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
  } else { existing.push("campaigns"); }

  // ─── 3. posts ───
  if (!(await tableExists(conn, "posts"))) {
    await conn.execute(`
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
  } else { existing.push("posts"); }

  // ─── 4. media_assets ───
  if (!(await tableExists(conn, "media_assets"))) {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS media_assets (
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
      )
    `);
    created.push("media_assets");
  } else { existing.push("media_assets"); }

  // ─── 5. agent_messages ───
  if (!(await tableExists(conn, "agent_messages"))) {
    await conn.execute(`
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
  } else { existing.push("agent_messages"); }

  // ─── 6. agent_tasks ───
  if (!(await tableExists(conn, "agent_tasks"))) {
    await conn.execute(`
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
  } else { existing.push("agent_tasks"); }

  // ─── 7. cron_jobs ───
  if (!(await tableExists(conn, "cron_jobs"))) {
    await conn.execute(`
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
  } else { existing.push("cron_jobs"); }

  // ─── 8. scratch_pad ───
  if (!(await tableExists(conn, "scratch_pad"))) {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS scratch_pad (
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
      )
    `);
    created.push("scratch_pad");
  } else { existing.push("scratch_pad"); }

  // ─── 9. agent_scratch_pad ───
  if (!(await tableExists(conn, "agent_scratch_pad"))) {
    await conn.execute(`
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
  } else { existing.push("agent_scratch_pad"); }

  // ─── 10. reflection_log ───
  if (!(await tableExists(conn, "reflection_log"))) {
    await conn.execute(`
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
  } else { existing.push("reflection_log"); }

  await conn.end();

  if (created.length > 0) {
    console.log(`[SchemaSync] Created ${created.length} tables: ${created.join(", ")}`);
  }
  if (existing.length > 0) {
    console.log(`[SchemaSync] ${existing.length} tables already exist: ${existing.join(", ")}`);
  }
  if (created.length === 0 && existing.length === 0) {
    console.log("[SchemaSync] No tables to create (connection may have failed)");
  }
}
