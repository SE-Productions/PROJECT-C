// Scratch Pad Router — CRUD for global memory, agent thoughts, and reflection logs
import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { scratchPad, agentScratchPad, reflectionLog } from "@db/schema";
import { eq, desc, like, or, and } from "drizzle-orm";

export const scratchPadRouter = createRouter({
  // ─── GLOBAL SCRATCH PAD ───

  list: publicQuery
    .input(z.object({
      category: z.string().optional(),
      bookId: z.number().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const params = input ?? { limit: 50, offset: 0 };

      let query = db.select().from(scratchPad);

      const conditions = [];
      if (params.category) conditions.push(eq(scratchPad.category, params.category));
      if (params.bookId) conditions.push(eq(scratchPad.bookId, params.bookId));
      if (params.search) {
        const q = `%${params.search}%`;
        conditions.push(or(like(scratchPad.key, q), like(scratchPad.value, q)));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const results = await query
        .orderBy(desc(scratchPad.updatedAt))
        .limit(params.limit)
        .offset(params.offset);

      // Get total count
      const allResults = conditions.length > 0
        ? await db.select({ id: scratchPad.id }).from(scratchPad).where(and(...conditions))
        : await db.select({ id: scratchPad.id }).from(scratchPad);

      return {
        items: results.map((r) => ({
          id: r.id,
          key: r.key,
          value: r.value,
          category: r.category ?? "general",
          tags: (r.tags as string[]) ?? [],
          source: r.source,
          bookId: r.bookId,
          accessCount: Number(r.accessCount ?? 0),
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        total: allResults.length,
      };
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const results = await db.select().from(scratchPad).where(eq(scratchPad.id, input.id)).limit(1);
      if (results.length === 0) return null;
      const r = results[0];
      return {
        id: r.id, key: r.key, value: r.value, category: r.category ?? "general",
        tags: (r.tags as string[]) ?? [], source: r.source, bookId: r.bookId,
        accessCount: Number(r.accessCount ?? 0), createdAt: r.createdAt, updatedAt: r.updatedAt,
      };
    }),

  create: publicQuery
    .input(z.object({
      key: z.string().min(1).max(255),
      value: z.string().min(1),
      category: z.string().max(100).default("general"),
      tags: z.array(z.string()).default([]),
      source: z.string().max(255).optional(),
      bookId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(scratchPad).values({
        key: input.key, value: input.value, category: input.category,
        tags: input.tags, source: input.source ?? null, bookId: input.bookId ?? null,
        accessCount: 0,
      });
      return { id: Number(result[0].insertId) };
    }),

  update: publicQuery
    .input(z.object({
      id: z.number(),
      key: z.string().min(1).max(255).optional(),
      value: z.string().min(1).optional(),
      category: z.string().max(100).optional(),
      tags: z.array(z.string()).optional(),
      source: z.string().max(255).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      await db.update(scratchPad).set(updates).where(eq(scratchPad.id, id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(scratchPad).where(eq(scratchPad.id, input.id));
      return { success: true };
    }),

  search: publicQuery
    .input(z.object({ query: z.string().min(1), limit: z.number().min(1).max(20).default(10) }))
    .query(async ({ input }) => {
      const db = getDb();
      const q = `%${input.query}%`;
      const results = await db.select()
        .from(scratchPad)
        .where(or(like(scratchPad.key, q), like(scratchPad.value, q)))
        .orderBy(desc(scratchPad.accessCount), desc(scratchPad.updatedAt))
        .limit(input.limit);

      // Increment access count
      for (const r of results) {
        await db.update(scratchPad)
          .set({ accessCount: (r.accessCount ?? 0) + 1 })
          .where(eq(scratchPad.id, r.id));
      }

      return results.map((r) => ({
        id: r.id, key: r.key, value: r.value, category: r.category ?? "general",
        tags: (r.tags as string[]) ?? [], source: r.source, bookId: r.bookId,
        accessCount: Number(r.accessCount ?? 0), updatedAt: r.updatedAt,
      }));
    }),

  getCategories: publicQuery.query(async () => {
    const db = getDb();
    const results = await db.select({ category: scratchPad.category }).from(scratchPad);
    const cats = new Set(results.map((r) => r.category ?? "general"));
    return Array.from(cats);
  }),

  // ─── AGENT SCRATCH PAD (Thoughts) ───

  listThoughts: publicQuery
    .input(z.object({
      taskId: z.number().optional(),
      agentType: z.enum(["planner", "search", "media", "social"]).optional(),
      bookId: z.number().optional(),
      limit: z.number().min(1).max(200).default(100),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const params = input ?? { limit: 100 };

      let query = db.select().from(agentScratchPad);
      const conditions = [];
      if (params.taskId) conditions.push(eq(agentScratchPad.taskId, params.taskId));
      if (params.agentType) conditions.push(eq(agentScratchPad.agentType, params.agentType));
      if (params.bookId) conditions.push(eq(agentScratchPad.bookId, params.bookId));
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const results = await query
        .orderBy(desc(agentScratchPad.createdAt))
        .limit(params.limit);

      return results.map((r) => ({
        id: r.id, agentType: r.agentType, taskId: r.taskId, bookId: r.bookId,
        thought: r.thought, decision: r.decision, reasoning: r.reasoning,
        reflectionScore: r.reflectionScore, isRelevant: r.isRelevant,
        status: r.status, createdAt: r.createdAt,
      }));
    }),

  // ─── REFLECTION LOGS ───

  listReflections: publicQuery
    .input(z.object({
      taskId: z.number().optional(),
      agentType: z.enum(["planner", "search", "media", "social"]).optional(),
      limit: z.number().min(1).max(200).default(100),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const params = input ?? { limit: 100 };

      let query = db.select().from(reflectionLog);
      const conditions = [];
      if (params.taskId) conditions.push(eq(reflectionLog.taskId, params.taskId));
      if (params.agentType) conditions.push(eq(reflectionLog.agentType, params.agentType));
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const results = await query
        .orderBy(desc(reflectionLog.createdAt))
        .limit(params.limit);

      return results.map((r) => ({
        id: r.id, agentType: r.agentType, taskId: r.taskId,
        originalDecision: r.originalDecision, reflectionResult: r.reflectionResult,
        alignedWithGoal: r.alignedWithGoal, correction: r.correction, createdAt: r.createdAt,
      }));
    }),

  getStats: publicQuery.query(async () => {
    const db = getDb();
    const [memories] = await db.select({ count: db.$count(scratchPad) }).from(scratchPad);
    const [thoughts] = await db.select({ count: db.$count(agentScratchPad) }).from(agentScratchPad);
    const [reflections] = await db.select({ count: db.$count(reflectionLog) }).from(reflectionLog);

    // Count by category
    const byCategory = await db.select({ category: scratchPad.category }).from(scratchPad);
    const categoryCounts: Record<string, number> = {};
    for (const c of byCategory) {
      const cat = c.category ?? "general";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    return {
      totalMemories: memories?.count ?? 0,
      totalThoughts: thoughts?.count ?? 0,
      totalReflections: reflections?.count ?? 0,
      byCategory: categoryCounts,
    };
  }),
});
