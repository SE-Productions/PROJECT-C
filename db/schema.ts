import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  json,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

export const books = mysqlTable("books", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  description: text("description"),
  genre: varchar("genre", { length: 100 }),
  coverImage: varchar("cover_image", { length: 1000 }),
  targetAudience: varchar("target_audience", { length: 255 }),
  publishDate: timestamp("publish_date"),
  status: mysqlEnum("status", ["draft", "active", "archived"]).notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const campaigns = mysqlTable("campaigns", {
  id: serial("id").primaryKey(),
  bookId: bigint("book_id", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  objective: mysqlEnum("objective", ["awareness", "engagement", "sales", "launch"]).default("awareness"),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).notNull().default("draft"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  platforms: json("platforms").$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const posts = mysqlTable("posts", {
  id: serial("id").primaryKey(),
  campaignId: bigint("campaign_id", { mode: "number", unsigned: true }),
  bookId: bigint("book_id", { mode: "number", unsigned: true }).notNull(),
  platform: mysqlEnum("platform", ["instagram", "tiktok", "facebook", "x", "youtube", "reddit"]).notNull(),
  content: text("content").notNull(),
  mediaUrls: json("media_urls").$type<string[]>(),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  status: mysqlEnum("status", ["draft", "scheduled", "published", "failed"]).notNull().default("draft"),
  composioActionId: varchar("composio_action_id", { length: 255 }),
  analytics: json("analytics").$type<{
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const mediaAssets = mysqlTable("media_assets", {
  id: serial("id").primaryKey(),
  bookId: bigint("book_id", { mode: "number", unsigned: true }),
  campaignId: bigint("campaign_id", { mode: "number", unsigned: true }),
  type: mysqlEnum("type", ["image", "video"]).notNull(),
  prompt: text("prompt"),
  url: varchar("url", { length: 1000 }).notNull(),
  thumbnailUrl: varchar("thumbnail_url", { length: 1000 }),
  platform: varchar("platform", { length: 50 }),
  status: mysqlEnum("status", ["generating", "ready", "failed"]).notNull().default("generating"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const agentTasks = mysqlTable("agent_tasks", {
  id: serial("id").primaryKey(),
  agentType: mysqlEnum("agent_type", ["planner", "search", "media", "social"]).notNull(),
  bookId: bigint("book_id", { mode: "number", unsigned: true }),
  campaignId: bigint("campaign_id", { mode: "number", unsigned: true }),
  task: text("task").notNull(),
  input: json("input"),
  output: text("output"),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const agentMessages = mysqlTable("agent_messages", {
  id: serial("id").primaryKey(),
  agentType: mysqlEnum("agent_type", ["planner", "search", "media", "social"]).notNull(),
  bookId: bigint("book_id", { mode: "number", unsigned: true }),
  role: mysqlEnum("role", ["user", "agent"]).notNull(),
  message: text("message").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── NEW: Cron Jobs for scheduled agent tasks ───
export const cronJobs = mysqlTable("cron_jobs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  agentType: mysqlEnum("agent_type", ["planner", "search", "media", "social"]).notNull(),
  bookId: bigint("book_id", { mode: "number", unsigned: true }),
  prompt: text("prompt").notNull(),
  schedule: mysqlEnum("schedule", ["hourly", "daily", "weekly", "custom"]).notNull().default("daily"),
  cronExpression: varchar("cron_expression", { length: 100 }),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  runCount: bigint("run_count", { mode: "number" }).notNull().default(0),
  status: mysqlEnum("status", ["active", "paused", "completed", "failed"]).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─── NEW: Smart Chat conversations ───
export const smartConversations = mysqlTable("smart_conversations", {
  id: serial("id").primaryKey(),
  userMessage: text("user_message").notNull(),
  parsedIntent: json("parsed_intent"),
  confirmed: mysqlEnum("confirmed", ["pending", "confirmed", "rejected"]).notNull().default("pending"),
  executionResult: text("execution_result"),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
