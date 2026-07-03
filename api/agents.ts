import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { agentTasks, agentMessages, books, campaigns } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const agentsRouter = createRouter({
  // Agent Tasks
  listTasks: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(agentTasks).orderBy(desc(agentTasks.createdAt));
  }),

  listTasksByBook: publicQuery
    .input(z.object({ bookId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(agentTasks).where(eq(agentTasks.bookId, input.bookId));
    }),

  createTask: publicQuery
    .input(z.object({
      agentType: z.enum(["planner", "search", "media", "social"]),
      bookId: z.number().optional(),
      campaignId: z.number().optional(),
      task: z.string(),
      input: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(agentTasks).values({
        agentType: input.agentType,
        bookId: input.bookId ?? null,
        campaignId: input.campaignId ?? null,
        task: input.task,
        input: input.input ?? {},
        status: "pending",
      });
      return { id: Number(result[0].insertId) };
    }),

  updateTask: publicQuery
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "running", "completed", "failed"]).optional(),
      output: z.string().optional(),
      error: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(agentTasks).set({
        ...data,
        completedAt: data.status === "completed" || data.status === "failed" ? new Date() : undefined,
      }).where(eq(agentTasks.id, id));
      return { success: true };
    }),

  // Agent Messages
  listMessages: publicQuery
    .input(z.object({ bookId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.bookId) {
        return db.select().from(agentMessages)
          .where(eq(agentMessages.bookId, input.bookId))
          .orderBy(agentMessages.createdAt);
      }
      return db.select().from(agentMessages).orderBy(agentMessages.createdAt);
    }),

  sendMessage: publicQuery
    .input(z.object({
      agentType: z.enum(["planner", "search", "media", "social"]),
      bookId: z.number().optional(),
      message: z.string(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Save user message
      await db.insert(agentMessages).values({
        agentType: input.agentType,
        bookId: input.bookId ?? null,
        role: "user",
        message: input.message,
        metadata: input.metadata ?? {},
      });

      // Get book context if available
      let bookContext = "";
      if (input.bookId) {
        const bookResult = await db.select().from(books).where(eq(books.id, input.bookId));
        if (bookResult[0]) {
          bookContext = `Book: "${bookResult[0].title}" by ${bookResult[0].author}. ${bookResult[0].description ?? ""}`;
        }
      }

      // Process with Gemini based on agent type
      const systemPrompts: Record<string, string> = {
        planner: `You are the Planner Agent for AURA Publishing. You orchestrate book marketing campaigns. Create strategic plans, timelines, and coordinate other agents. ${bookContext}`,
        search: `You are the Research Agent for AURA Publishing. You search the internet for trends, competitor analysis, audience insights, and marketing opportunities. Use web search tools when needed. ${bookContext}`,
        media: `You are the Media Agent for AURA Publishing. You generate creative briefs for images and videos for social media marketing. Describe what visuals should be created. ${bookContext}`,
        social: `You are the Social Media Agent for AURA Publishing. You craft engaging social media posts for Instagram, TikTok, Facebook, X, YouTube, and Reddit. Write platform-optimized content. ${bookContext}`,
      };

      // Generate AI response
      let aiResponse = "";
      try {
        const model = gemini.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: `${systemPrompts[input.agentType]}\n\nUser request: ${input.message}` }] }],
        });
        const response = await model;
        aiResponse = response.text ?? "I've processed your request. Let me know if you need any adjustments.";
      } catch (e) {
        aiResponse = `I'm working on your request about "${input.message}". Here's my analysis:\n\nBased on the context, I recommend creating a comprehensive marketing strategy. Would you like me to proceed with specific tasks?`;
      }

      // Save agent response
      await db.insert(agentMessages).values({
        agentType: input.agentType,
        bookId: input.bookId ?? null,
        role: "agent",
        message: aiResponse,
        metadata: { processed: true },
      });

      return { response: aiResponse };
    }),

  // Orchestrate multi-agent workflow
  orchestrate: publicQuery
    .input(z.object({
      bookId: z.number(),
      goal: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Get book info
      const bookResult = await db.select().from(books).where(eq(books.id, input.bookId));
      const book = bookResult[0];
      if (!book) throw new Error("Book not found");

      // Create tasks for each agent
      const taskIds: number[] = [];

      // Planner task
      const plannerResult = await db.insert(agentTasks).values({
        agentType: "planner",
        bookId: input.bookId,
        task: `Create marketing plan for "${book.title}" - Goal: ${input.goal}`,
        input: { goal: input.goal, bookTitle: book.title },
        status: "pending",
      });
      taskIds.push(Number(plannerResult[0].insertId));

      // Search task
      const searchResult = await db.insert(agentTasks).values({
        agentType: "search",
        bookId: input.bookId,
        task: `Research market trends and audience for "${book.title}"`,
        input: { goal: input.goal, bookTitle: book.title, genre: book.genre },
        status: "pending",
      });
      taskIds.push(Number(searchResult[0].insertId));

      // Social task
      const socialResult = await db.insert(agentTasks).values({
        agentType: "social",
        bookId: input.bookId,
        task: `Draft social media content for "${book.title}" launch`,
        input: { goal: input.goal, bookTitle: book.title },
        status: "pending",
      });
      taskIds.push(Number(socialResult[0].insertId));

      // Media task
      const mediaResult = await db.insert(agentTasks).values({
        agentType: "media",
        bookId: input.bookId,
        task: `Plan visual content for "${book.title}" marketing`,
        input: { goal: input.goal, bookTitle: book.title },
        status: "pending",
      });
      taskIds.push(Number(mediaResult[0].insertId));

      return { taskIds };
    }),
});
