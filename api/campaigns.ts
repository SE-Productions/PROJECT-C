import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { campaigns } from "@db/schema";
import { eq } from "drizzle-orm";

export const campaignsRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(campaigns).orderBy(campaigns.createdAt);
  }),

  listByBook: publicQuery
    .input(z.object({ bookId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(campaigns).where(eq(campaigns.bookId, input.bookId));
    }),

  create: publicQuery
    .input(z.object({
      bookId: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
      objective: z.enum(["awareness", "engagement", "sales", "launch"]).optional(),
      platforms: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(campaigns).values({
        bookId: input.bookId,
        name: input.name,
        description: input.description ?? null,
        objective: input.objective ?? "awareness",
        platforms: input.platforms ?? [],
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        status: "draft",
      });
      return { id: Number(result[0].insertId) };
    }),

  update: publicQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      objective: z.enum(["awareness", "engagement", "sales", "launch"]).optional(),
      status: z.enum(["draft", "active", "paused", "completed"]).optional(),
      platforms: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(campaigns).set({
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        updatedAt: new Date(),
      }).where(eq(campaigns.id, id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(campaigns).where(eq(campaigns.id, input.id));
      return { success: true };
    }),
});
