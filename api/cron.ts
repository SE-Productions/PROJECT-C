// Cron Scheduler — Background scheduled agent tasks
import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { agentTasks, agentMessages } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import { runAgentLoop } from "./runtime/agent-loop";
import { getInsertId } from "./lib/db-utils";

const activeCronIntervals: Map<number, NodeJS.Timeout> = new Map();

function getIntervalMs(schedule: string): number {
  switch (schedule) {
    case "hourly": return 60 * 60 * 1000;
    case "daily": return 24 * 60 * 60 * 1000;
    case "weekly": return 7 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

async function executeCronJob(jobId: number, agentType: string, prompt: string, bookId?: number) {
  console.log(`[CRON] Executing job ${jobId}: ${agentType} - ${prompt}`);
  try {
    const db = getDb();
    const recent = await db.select().from(agentMessages)
      .where(eq(agentMessages.agentType, agentType as any))
      .orderBy(agentMessages.createdAt);
    const memory = recent.slice(-10).map((m) => ({
      timestamp: m.createdAt, role: m.role as any,
      content: m.message, metadata: m.metadata ?? {},
    }));
    const result = await runAgentLoop({
      agentType: agentType as any, bookId,
      userMessage: prompt, memory, iteration: 0,
    });
    await db.insert(agentTasks).values({
      agentType: agentType as any, bookId: bookId ?? null,
      task: `[CRON #${jobId}] ${prompt}`,
      status: "completed", output: result.finalResponse,
      completedAt: new Date(),
    });
    console.log(`[CRON] Job ${jobId} completed`);
  } catch (error: any) {
    console.error(`[CRON] Job ${jobId} failed:`, error.message);
  }
}

export const cronRouter = createRouter({
  list: authedQuery.query(async () => {
    try {
      const db = getDb();
      const result = await db.execute(sql`SELECT id, name, description, agent_type, book_id, prompt, schedule, last_run_at, next_run_at, run_count, status, created_at FROM cron_jobs ORDER BY created_at DESC`);
      return { jobs: (result as any)[0] ?? [] };
    } catch {
      return { jobs: [] };
    }
  }),

  create: authedQuery
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      agentType: z.enum(["planner", "search", "media", "social"]),
      bookId: z.number().optional(),
      prompt: z.string().min(1),
      schedule: z.enum(["hourly", "daily", "weekly"]).default("daily"),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      try {
        const result = await db.execute(sql`INSERT INTO cron_jobs (name, description, agent_type, book_id, prompt, schedule, next_run_at, status, run_count) VALUES (${input.name}, ${input.description ?? null}, ${input.agentType}, ${input.bookId ?? null}, ${input.prompt}, ${input.schedule}, DATE_ADD(NOW(), INTERVAL 1 DAY), 'active', 0)`);
        const jobId = Number(getInsertId(result) ?? Date.now());
        const intervalMs = getIntervalMs(input.schedule);
        const interval = setInterval(() => {
          executeCronJob(jobId, input.agentType, input.prompt, input.bookId);
        }, intervalMs);
        activeCronIntervals.set(jobId, interval);
        return { id: jobId, message: "Cron job created" };
      } catch {
        // Table might not exist, create it
        await db.execute(sql`CREATE TABLE IF NOT EXISTS cron_jobs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          agent_type ENUM('planner','search','media','social') NOT NULL,
          book_id BIGINT UNSIGNED,
          prompt TEXT NOT NULL,
          schedule ENUM('hourly','daily','weekly') DEFAULT 'daily',
          last_run_at TIMESTAMP,
          next_run_at TIMESTAMP,
          run_count BIGINT NOT NULL DEFAULT 0,
          status ENUM('active','paused','completed','failed') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
        )`);
        const result = await db.execute(sql`INSERT INTO cron_jobs (name, description, agent_type, book_id, prompt, schedule, next_run_at, status, run_count) VALUES (${input.name}, ${input.description ?? null}, ${input.agentType}, ${input.bookId ?? null}, ${input.prompt}, ${input.schedule}, DATE_ADD(NOW(), INTERVAL 1 DAY), 'active', 0)`);
        const jobId = Number(getInsertId(result) ?? Date.now());
        const intervalMs = getIntervalMs(input.schedule);
        const interval = setInterval(() => {
          executeCronJob(jobId, input.agentType, input.prompt, input.bookId);
        }, intervalMs);
        activeCronIntervals.set(jobId, interval);
        return { id: jobId, message: "Cron job created (table auto-created)" };
      }
    }),

  toggle: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(["active", "paused"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.execute(sql`UPDATE cron_jobs SET status = ${input.status} WHERE id = ${input.id}`);
      if (input.status === "paused") {
        const interval = activeCronIntervals.get(input.id);
        if (interval) { clearInterval(interval); activeCronIntervals.delete(input.id); }
      }
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const interval = activeCronIntervals.get(input.id);
      if (interval) { clearInterval(interval); activeCronIntervals.delete(input.id); }
      const db = getDb();
      await db.execute(sql`DELETE FROM cron_jobs WHERE id = ${input.id}`);
      return { success: true };
    }),

  runNow: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.execute(sql`SELECT agent_type, book_id, prompt FROM cron_jobs WHERE id = ${input.id}`);
      const rows = (result as any)[0] as any[];
      if (!rows || rows.length === 0) throw new Error("Job not found");
      const job = rows[0];
      await executeCronJob(input.id, job.agent_type, job.prompt, job.book_id ?? undefined);
      await db.execute(sql`UPDATE cron_jobs SET last_run_at = NOW(), run_count = run_count + 1 WHERE id = ${input.id}`);
      return { success: true, message: "Job executed" };
    }),
});
