import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { mediaAssets } from "@db/schema";
import { eq } from "drizzle-orm";

export const mediaRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(mediaAssets).orderBy(mediaAssets.createdAt);
  }),

  listByBook: publicQuery
    .input(z.object({ bookId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(mediaAssets).where(eq(mediaAssets.bookId, input.bookId));
    }),

  create: publicQuery
    .input(z.object({
      bookId: z.number().optional(),
      campaignId: z.number().optional(),
      type: z.enum(["image", "video"]),
      prompt: z.string().optional(),
      url: z.string(),
      thumbnailUrl: z.string().optional(),
      platform: z.string().optional(),
      status: z.enum(["generating", "ready", "failed"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(mediaAssets).values({
        bookId: input.bookId ?? null,
        campaignId: input.campaignId ?? null,
        type: input.type,
        prompt: input.prompt ?? null,
        url: input.url,
        thumbnailUrl: input.thumbnailUrl ?? null,
        platform: input.platform ?? null,
        status: input.status ?? "ready",
      });
      return { id: Number(result[0].insertId) };
    }),

  update: publicQuery
    .input(z.object({
      id: z.number(),
      url: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      status: z.enum(["generating", "ready", "failed"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(mediaAssets).set(input).where(eq(mediaAssets.id, input.id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(mediaAssets).where(eq(mediaAssets.id, input.id));
      return { success: true };
    }),
});
