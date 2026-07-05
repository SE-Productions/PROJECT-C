import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { books } from "@db/schema";
import { eq } from "drizzle-orm";
import { getInsertId } from "./lib/db-utils";

export const booksRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(books).orderBy(books.createdAt);
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(books).where(eq(books.id, input.id));
      return result[0] ?? null;
    }),

  create: publicQuery
    .input(z.object({
      title: z.string().min(1),
      author: z.string().min(1),
      description: z.string().optional(),
      genre: z.string().optional(),
      coverImage: z.string().optional(),
      targetAudience: z.string().optional(),
      publishDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(books).values({
        title: input.title,
        author: input.author,
        description: input.description ?? null,
        genre: input.genre ?? null,
        coverImage: input.coverImage ?? null,
        targetAudience: input.targetAudience ?? null,
        publishDate: input.publishDate ? new Date(input.publishDate) : null,
        status: "active",
      });
      return { id: Number(getInsertId(result)) };
    }),

  update: publicQuery
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      author: z.string().optional(),
      description: z.string().optional(),
      genre: z.string().optional(),
      coverImage: z.string().optional(),
      targetAudience: z.string().optional(),
      publishDate: z.string().optional(),
      status: z.enum(["draft", "active", "archived"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(books).set({
        ...data,
        publishDate: data.publishDate ? new Date(data.publishDate) : undefined,
        updatedAt: new Date(),
      }).where(eq(books.id, id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(books).where(eq(books.id, input.id));
      return { success: true };
    }),
});
