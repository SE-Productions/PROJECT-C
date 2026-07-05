import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { mediaAssets } from "@db/schema";
import { eq } from "drizzle-orm";
import { getInsertId } from "./lib/db-utils";

export const mediaRouter = createRouter({
  list: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(mediaAssets).orderBy(mediaAssets.createdAt);
  }),

  listByBook: authedQuery
    .input(z.object({ bookId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(mediaAssets).where(eq(mediaAssets.bookId, input.bookId));
    }),

  create: authedQuery
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
      return { id: Number(getInsertId(result)) };
    }),

  update: authedQuery
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

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(mediaAssets).where(eq(mediaAssets.id, input.id));
      return { success: true };
    }),
});
