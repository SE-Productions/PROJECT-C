import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { runAgentLoop } from "./agent-loop";
import { TOOL_REGISTRY } from "./tools";
import { AGENT_PERSONAS } from "./agents";
import { getDb } from "../queries/connection";
import { agentMessages, agentTasks } from "@db/schema";
import { eq } from "drizzle-orm";
import type { AgentContext } from "./types";

// DB enum: planner, search, media, social (NOT "research")
const agentTypeEnum = z.enum(["planner", "search", "media", "social"]);

export const runtimeRouter = createRouter({
  getPersonas: publicQuery.query(() =>
    Object.values(AGENT_PERSONAS).map((p) => ({
      name: p.name, type: p.type, description: p.description,
      tools: p.tools, maxIterations: p.maxIterations,
    }))
  ),

  getTools: publicQuery.query(() =>
    Object.values(TOOL_REGISTRY).map((t) => ({
      name: t.name, description: t.description, parameters: t.parameters,
    }))
  ),

  runAgent: publicQuery
    .input(z.object({
      agentType: agentTypeEnum,
      message: z.string().min(1),
      bookId: z.number().optional(),
      campaignId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const recent = await db.select().from(agentMessages)
        .where(eq(agentMessages.agentType, input.agentType))
        .orderBy(agentMessages.createdAt);

      const memory = recent.slice(-20).map((m) => ({
        timestamp: m.createdAt, role: m.role as any,
        content: m.message, metadata: m.metadata ?? {},
      }));

      const taskResult = await db.insert(agentTasks).values({
        agentType: input.agentType, bookId: input.bookId ?? null,
        campaignId: input.campaignId ?? null, task: input.message,
        status: "running", input: { message: input.message, bookId: input.bookId },
      });
      const taskId = Number(taskResult[0].insertId);

      try {
        const ctx: AgentContext = {
          agentType: input.agentType, bookId: input.bookId,
          campaignId: input.campaignId, userMessage: input.message,
          memory, iteration: 0,
        };
        const result = await runAgentLoop(ctx);

        await db.update(agentTasks).set({
          status: "completed", output: result.finalResponse, completedAt: new Date(),
        }).where(eq(agentTasks.id, taskId));

        return {
          response: result.finalResponse, taskId,
          iterations: result.iterations,
          toolCalls: result.toolCalls.map((tc) => ({
            tool: tc.tool, success: tc.result.success, output: tc.result.output,
          })),
        };
      } catch (error: any) {
        await db.update(agentTasks).set({
          status: "failed", error: error.message, completedAt: new Date(),
        }).where(eq(agentTasks.id, taskId));
        throw new Error(error.message ?? "Agent failed");
      }
    }),

  getStats: publicQuery.query(async () => {
    const tasks = await getDb().select().from(agentTasks);
    return {
      totalTasks: tasks.length,
      completed: tasks.filter((t) => t.status === "completed").length,
      running: tasks.filter((t) => t.status === "running").length,
      failed: tasks.filter((t) => t.status === "failed").length,
      pending: tasks.filter((t) => t.status === "pending").length,
      byAgent: {
        planner: tasks.filter((t) => t.agentType === "planner").length,
        search: tasks.filter((t) => t.agentType === "search").length,
        media: tasks.filter((t) => t.agentType === "media").length,
        social: tasks.filter((t) => t.agentType === "social").length,
      },
    };
  }),
});
