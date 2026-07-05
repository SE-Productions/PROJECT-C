// Smart Chat Router — Natural language → Intent → Confirmation → Execution
import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { parseIntent } from "./intent";
import { runAgentLoop } from "./runtime/agent-loop";
import { runCrew } from "./runtime/crew";
import { getDb } from "./queries/connection";
import { books, agentMessages, agentTasks } from "@db/schema";
import { eq } from "drizzle-orm";
import { getInsertId } from "./lib/db-utils";

export const smartChatRouter = createRouter({
  // Step 1: Parse intent from natural language
  parse: publicQuery
    .input(z.object({ message: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const allBooks = await db.select().from(books);
      const intent = await parseIntent(input.message, { books: allBooks });

      // Try to auto-resolve book_id from context
      if (!intent.params.book_id && allBooks.length > 0) {
        // Check if user mentioned a book title
        const mentionedBook = allBooks.find((b) =>
          input.message.toLowerCase().includes(b.title.toLowerCase())
        );
        if (mentionedBook) {
          intent.params.book_id = mentionedBook.id;
        } else if (allBooks.length === 1) {
          intent.params.book_id = allBooks[0].id;
        }
      }

      return intent;
    }),

  // Step 2: Execute the parsed intent (after confirmation)
  execute: publicQuery
    .input(z.object({
      action: z.string(),
      agentType: z.enum(["planner", "search", "media", "social"]),
      params: z.record(z.string(), z.any()),
      description: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Get memory for the agent
      const recent = await db.select().from(agentMessages)
        .where(eq(agentMessages.agentType, input.agentType))
        .orderBy(agentMessages.createdAt);

      const memory = recent.slice(-15).map((m) => ({
        timestamp: m.createdAt, role: m.role as any,
        content: m.message, metadata: m.metadata ?? {},
      }));

      // Build execution prompt from params
      const execPrompt = buildExecutionPrompt(input.action, input.params);

      // Create task record
      const taskResult = await db.insert(agentTasks).values({
        agentType: input.agentType,
        bookId: input.params.book_id ?? null,
        task: `[SMART] ${input.description}`,
        status: "running",
        input: { action: input.action, params: input.params },
      });
      const taskId = Number(getInsertId(taskResult));

      try {
        const result = await runAgentLoop({
          agentType: input.agentType,
          bookId: input.params.book_id ?? undefined,
          userMessage: execPrompt,
          memory,
          iteration: 0,
        });

        await db.update(agentTasks).set({
          status: "completed", output: result.finalResponse,
          completedAt: new Date(),
        }).where(eq(agentTasks.id, taskId));

        return {
          success: true,
          response: result.finalResponse,
          taskId,
          toolCalls: result.toolCalls.map((tc) => ({
            tool: tc.tool, success: tc.result.success, output: tc.result.output,
          })),
        };
      } catch (error: any) {
        await db.update(agentTasks).set({
          status: "failed", error: error.message,
          completedAt: new Date(),
        }).where(eq(agentTasks.id, taskId));

        return { success: false, error: error.message };
      }
    }),

  // Execute crew from smart chat
  executeCrew: publicQuery
    .input(z.object({
      goal: z.string().min(1),
      bookId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      let bookContext = "";
      if (input.bookId) {
        const book = await db.select().from(books).where(eq(books.id, input.bookId));
        if (book[0]) bookContext = `"${book[0].title}" by ${book[0].author}. ${book[0].description ?? ""}`;
      }

      const result = await runCrew(input.goal, input.bookId, bookContext);

      return {
        success: true,
        finalReport: result.finalReport,
        tasks: result.tasks.map((t) => ({
          id: t.id, description: t.description,
          assignedAgent: t.assignedAgent, status: t.status,
          output: t.output,
        })),
        completed: result.completed,
      };
    }),
});

function buildExecutionPrompt(action: string, params: Record<string, any>): string {
  switch (action) {
    case "create_campaign":
      return `Create a marketing campaign named "${params.name ?? params.goal ?? "New Campaign"}" with objective "${params.objective ?? "awareness"}" for platforms: ${params.platforms ?? "instagram,facebook"}. Book ID: ${params.book_id ?? "default"}.`;
    case "write_post":
      return `Write a social media post for ${params.platform ?? "instagram"} about: ${params.content ?? params.prompt ?? "our book"}. Book ID: ${params.book_id ?? "default"}.`;
    case "generate_image":
      return `Generate a promotional image: ${params.prompt ?? params.content ?? "book cover"}. ${params.platform ? `For platform: ${params.platform}.` : ""} ${params.book_id ? `Book ID: ${params.book_id}.` : ""}`;
    case "generate_video":
      return `Generate a promotional video: ${params.prompt ?? params.content ?? "book trailer"}. ${params.book_id ? `Book ID: ${params.book_id}.` : ""}`;
    case "research":
      return `Research the following and provide actionable insights: ${params.query ?? params.prompt ?? params.content}`;
    case "create_cron":
      return `Set up a recurring task: "${params.name ?? params.prompt}". Schedule: ${params.schedule ?? "daily"}. Agent: ${params.agent_type ?? "social"}.`;
    default:
      return params.message ?? params.prompt ?? params.content ?? "Help with publishing";
  }
}
