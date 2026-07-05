import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  json,
  pgEnum,
  real,
  integer,
} from "drizzle-orm/pg-core";

// ─── ENUMS ───
export const statusEnum = pgEnum("status", ["draft", "active", "archived", "paused", "completed", "scheduled", "published", "failed", "pending", "running", "resolved", "discarded"]);
export const objectiveEnum = pgEnum("objective", ["awareness", "engagement", "sales", "launch"]);
export const platformEnum = pgEnum("platform", ["instagram", "tiktok", "facebook", "x", "youtube", "reddit"]);
export const agentTypeEnum = pgEnum("agent_type", ["planner", "search", "media", "social"]);
export const roleEnum = pgEnum("role", ["user", "agent"]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);
export const relevanceEnum = pgEnum("relevance", ["yes", "no", "uncertain"]);
export const alignmentEnum = pgEnum("alignment", ["yes", "no", "partial"]);

// ─── BOOKS ───
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  description: text("description"),
  genre: varchar("genre", { length: 100 }),
  coverImage: varchar("cover_image", { length: 1000 }),
  targetAudience: varchar("target_audience", { length: 255 }),
  publishDate: timestamp("publish_date", { mode: "string" }),
  status: statusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── CAMPAIGNS ───
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  objective: objectiveEnum("objective").default("awareness"),
  status: statusEnum("status").notNull().default("draft"),
  startDate: timestamp("start_date", { mode: "string" }),
  endDate: timestamp("end_date", { mode: "string" }),
  platforms: json("platforms").$type<string[]>(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── POSTS ───
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id"),
  bookId: integer("book_id").notNull(),
  platform: platformEnum("platform").notNull(),
  content: text("content").notNull(),
  mediaUrls: json("media_urls").$type<string[]>(),
  scheduledAt: timestamp("scheduled_at", { mode: "string" }),
  publishedAt: timestamp("published_at", { mode: "string" }),
  status: statusEnum("status").notNull().default("draft"),
  composioActionId: varchar("composio_action_id", { length: 255 }),
  analytics: json("analytics").$type<{
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
  }>(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── MEDIA ASSETS ───
export const mediaAssets = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id"),
  campaignId: integer("campaign_id"),
  type: mediaTypeEnum("type").notNull(),
  prompt: text("prompt"),
  url: varchar("url", { length: 1000 }).default("pending").notNull(),
  thumbnailUrl: varchar("thumbnail_url", { length: 1000 }),
  platform: varchar("platform", { length: 50 }),
  status: statusEnum("status").notNull().default("generating"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── AGENT TASKS ───
export const agentTasks = pgTable("agent_tasks", {
  id: serial("id").primaryKey(),
  agentType: agentTypeEnum("agent_type").notNull(),
  bookId: integer("book_id"),
  campaignId: integer("campaign_id"),
  task: text("task").notNull(),
  input: json("input"),
  output: text("output"),
  status: statusEnum("status").notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { mode: "string" }),
});

// ─── AGENT MESSAGES ───
export const agentMessages = pgTable("agent_messages", {
  id: serial("id").primaryKey(),
  agentType: agentTypeEnum("agent_type").notNull(),
  bookId: integer("book_id"),
  role: roleEnum("role").notNull(),
  message: text("message").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── GLOBAL SCRATCH PAD — Persistent RAG memory ───
export const scratchPad = pgTable("scratch_pad", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(),
  category: varchar("category", { length: 100 }).default("general"),
  tags: json("tags").$type<string[]>(),
  source: varchar("source", { length: 255 }),
  bookId: integer("book_id"),
  accessCount: integer("access_count").default(0),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── AGENT SCRATCH PAD — Temporary working memory per agent session ───
export const agentScratchPad = pgTable("agent_scratch_pad", {
  id: serial("id").primaryKey(),
  agentType: agentTypeEnum("agent_type").notNull(),
  taskId: integer("task_id"),
  bookId: integer("book_id"),
  thought: text("thought").notNull(),
  decision: text("decision"),
  reasoning: text("reasoning"),
  reflectionScore: real("reflection_score"),
  isRelevant: relevanceEnum("is_relevant").default("uncertain"),
  status: statusEnum("status").default("active"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// ─── REFLECTION LOG — Decision audit trail ───
export const reflectionLog = pgTable("reflection_log", {
  id: serial("id").primaryKey(),
  agentType: agentTypeEnum("agent_type").notNull(),
  taskId: integer("task_id"),
  originalDecision: text("original_decision").notNull(),
  reflectionResult: text("reflection_result").notNull(),
  alignedWithGoal: alignmentEnum("aligned_with_goal").notNull(),
  correction: text("correction"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});
