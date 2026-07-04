import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { agentTasks, agentMessages, books } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { callGemini } from "./lib/gemini";

async function generateResponse(systemPrompt: string, userMessage: string): Promise<string> {
  const prompt = `${systemPrompt}\n\nUser request: ${userMessage}`;
  const text = await callGemini(prompt, { temperature: 0.7, maxTokens: 2048 });
  if (text) return text;
  return generateFallbackResponse(userMessage);
}

function generateFallbackResponse(userMessage: string): string {
  return `I've analyzed your request about "${userMessage}". Here's my recommendation:

1. Start by creating a detailed marketing strategy aligned with your book's target audience
2. Research current trends in your genre to find the best promotional angles
3. Develop visual assets (cover reveals, quote cards, teaser videos) for social media
4. Create platform-specific content optimized for each social network's audience
5. Schedule posts strategically across the campaign timeline

Would you like me to dive deeper into any of these areas?`;
}

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
      input: z.record(z.string(), z.any()).optional(),
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
      metadata: z.record(z.string(), z.any()).optional(),
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
          bookContext = `Book: "${bookResult[0].title}" by ${bookResult[0].author}. ${bookResult[0].description ?? ""}. Genre: ${bookResult[0].genre ?? "Unknown"}. Target Audience: ${bookResult[0].targetAudience ?? "General"}.`;
        }
      }

      // System prompts per agent
      const systemPrompts: Record<string, string> = {
        planner: `You are the Planner Agent for AURA Publishing. You orchestrate book marketing campaigns. Create strategic plans, timelines, and coordinate other agents. You are expert at book launch strategy, audience targeting, and campaign management. ${bookContext}`,
        search: `You are the Research Agent for AURA Publishing. You search the internet for trends, competitor analysis, audience insights, and marketing opportunities. You provide data-driven recommendations. ${bookContext}`,
        media: `You are the Media Agent for AURA Publishing. You generate creative briefs for images and videos for social media marketing. You describe what visuals should be created, including style, composition, mood, and platform-specific requirements. ${bookContext}`,
        social: `You are the Social Media Agent for AURA Publishing. You craft engaging social media posts for Instagram, TikTok, Facebook, X (Twitter), YouTube, and Reddit. You write platform-optimized content that drives engagement. ${bookContext}`,
      };

      // Generate AI response via Gemini (resilient client)
      const aiResponse = await generateResponse(systemPrompts[input.agentType], input.message);

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

      const tasksToCreate = [
        {
          agentType: "planner" as const,
          task: `Create marketing plan for "${book.title}" - Goal: ${input.goal}`,
          input: { goal: input.goal, bookTitle: book.title },
        },
        {
          agentType: "search" as const,
          task: `Research market trends and audience for "${book.title}"`,
          input: { goal: input.goal, bookTitle: book.title, genre: book.genre },
        },
        {
          agentType: "social" as const,
          task: `Draft social media content for "${book.title}" launch`,
          input: { goal: input.goal, bookTitle: book.title },
        },
        {
          agentType: "media" as const,
          task: `Plan visual content for "${book.title}" marketing`,
          input: { goal: input.goal, bookTitle: book.title },
        },
      ];

      for (const t of tasksToCreate) {
        const result = await db.insert(agentTasks).values({
          agentType: t.agentType,
          bookId: input.bookId,
          task: t.task,
          input: t.input,
          status: "pending",
        });
        taskIds.push(Number(result[0].insertId));
      }

      return { taskIds };
    }),
});
