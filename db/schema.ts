import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  json,
  mysqlEnum,
  float,
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
  url: varchar("url", { length: 1000 }).default("").notNull(),
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

// ─── GLOBAL SCRATCH PAD — Persistent RAG memory ───
export const scratchPad = mysqlTable("scratch_pad", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(),
  category: varchar("category", { length: 100 }).default("general"),
  tags: json("tags").$type<string[]>(),
  source: varchar("source", { length: 255 }),
  bookId: bigint("book_id", { mode: "number", unsigned: true }),
  accessCount: bigint("access_count", { mode: "number" }).default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─── AGENT SCRATCH PAD — Temporary working memory per agent session ───
export const agentScratchPad = mysqlTable("agent_scratch_pad", {
  id: serial("id").primaryKey(),
  agentType: mysqlEnum("agent_type", ["planner", "search", "media", "social"]).notNull(),
  taskId: bigint("task_id", { mode: "number", unsigned: true }),
  bookId: bigint("book_id", { mode: "number", unsigned: true }),
  thought: text("thought").notNull(),
  decision: text("decision"),
  reasoning: text("reasoning"),
  reflectionScore: float("reflection_score"),
  isRelevant: mysqlEnum("is_relevant", ["yes", "no", "uncertain"]).default("uncertain"),
  status: mysqlEnum("status", ["active", "resolved", "discarded"]).default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── REFLECTION LOG — Decision audit trail ───
export const reflectionLog = mysqlTable("reflection_log", {
  id: serial("id").primaryKey(),
  agentType: mysqlEnum("agent_type", ["planner", "search", "media", "social"]).notNull(),
  taskId: bigint("task_id", { mode: "number", unsigned: true }),
  originalDecision: text("original_decision").notNull(),
  reflectionResult: text("reflection_result").notNull(),
  alignedWithGoal: mysqlEnum("aligned_with_goal", ["yes", "no", "partial"]).notNull(),
  correction: text("correction"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
