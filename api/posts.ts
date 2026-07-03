import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { posts } from "@db/schema";
import { eq, and, gte } from "drizzle-orm";

export const postsRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(posts).orderBy(posts.createdAt);
  }),

  listByBook: publicQuery
    .input(z.object({ bookId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(posts).where(eq(posts.bookId, input.bookId));
    }),

  listByCampaign: publicQuery
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(posts).where(eq(posts.campaignId, input.campaignId));
    }),

  listScheduled: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(posts).where(eq(posts.status, "scheduled"));
  }),

  create: publicQuery
    .input(z.object({
      bookId: z.number(),
      campaignId: z.number().optional(),
      platform: z.enum(["instagram", "tiktok", "facebook", "x", "youtube", "reddit"]),
      content: z.string().min(1),
      mediaUrls: z.array(z.string()).optional(),
      scheduledAt: z.string().optional(),
      status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(posts).values({
        bookId: input.bookId,
        campaignId: input.campaignId ?? null,
        platform: input.platform,
        content: input.content,
        mediaUrls: input.mediaUrls ?? [],
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        status: input.status ?? "draft",
      });
      return { id: Number(result[0].insertId) };
    }),

  update: publicQuery
    .input(z.object({
      id: z.number(),
      content: z.string().optional(),
      mediaUrls: z.array(z.string()).optional(),
      scheduledAt: z.string().optional(),
      status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
      publishedAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(posts).set({
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
        updatedAt: new Date(),
      }).where(eq(posts.id, id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(posts).where(eq(posts.id, input.id));
      return { success: true };
    }),
});
