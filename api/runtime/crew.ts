// Crew Manager — CrewAI-inspired multi-agent task delegation system
// A Manager agent breaks goals into tasks, delegates to specialists, reviews output
import { getDb } from "../queries/connection";
import { agentTasks, agentMessages } from "@db/schema";
import { eq } from "drizzle-orm";
import { routePrompt } from "../lib/model-router";
import { getInsertId } from "../lib/db-utils";

interface CrewTask {
  id: number;
  description: string;
  assignedAgent: "planner" | "search" | "media" | "social";
  dependsOn?: number[];
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
  error?: string;
}

interface CrewExecution {
  crewId: number;
  goal: string;
  bookId?: number;
  tasks: CrewTask[];
  finalReport: string;
  completed: boolean;
}

/**
 * Call Gemini to break a goal into sub-tasks for the crew
 */
async function planCrewTasks(goal: string, bookContext: string): Promise<Omit<CrewTask, "id" | "status" | "output" | "error">[]> {
  const prompt = `You are the Crew Manager for AURA Publishing. Break this marketing goal into specific sub-tasks for a team of AI agents.

Available agents:
- Orion (planner): Strategy, timelines, campaign creation
- Scout (search): Web research, trends, competitor analysis  
- Vision (media): Image generation, video concepts, visual creative
- Echo (social): Social media posts, publishing, engagement

Book context: ${bookContext || "No specific book."}
Goal: ${goal}

Respond ONLY with a JSON array like:
[{"description": "Research trending hashtags for romance novels", "assignedAgent": "search"}, {"description": "Generate a book cover teaser image", "assignedAgent": "media"}]

Create 3-6 tasks. Tasks should be specific and actionable. Consider dependencies (research before creation, creation before publishing).`;

  const result = await routePrompt("planner", prompt, { temperature: 0.3, maxTokens: 2048 });
  const text = result?.text ?? null;
  if (!text) return [{ description: goal, assignedAgent: "planner" }];

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [{ description: goal, assignedAgent: "planner" }];

  try {
    const tasks = JSON.parse(jsonMatch[0]);
    return tasks.map((t: any) => ({
      description: String(t.description),
      assignedAgent: ["planner", "search", "media", "social"].includes(t.assignedAgent)
        ? t.assignedAgent
        : "planner",
    }));
  } catch {
    return [{ description: goal, assignedAgent: "planner" }];
  }
}

/**
 * Execute a single crew task by running the assigned agent
 */
async function executeCrewTask(task: CrewTask, bookId?: number): Promise<CrewTask> {
  const db = getDb();

  // Save task record
  const result = await db.insert(agentTasks).values({
    agentType: task.assignedAgent,
    bookId: bookId ?? null,
    task: task.description,
    status: "running",
    input: { crewTaskId: task.id, description: task.description },
  });
  const dbTaskId = Number(getInsertId(result));

  try {
    // Get recent memory for this agent
    const recent = await db.select().from(agentMessages)
      .where(eq(agentMessages.agentType, task.assignedAgent as any))
      .orderBy(agentMessages.createdAt);

    const memory = recent.slice(-15).map((m) => ({
      timestamp: m.createdAt,
      role: m.role as any,
      content: m.message,
      metadata: m.metadata ?? {},
    }));

    // Run the agent loop
    const { runAgentLoop } = await import("./agent-loop");
    const loopResult = await runAgentLoop({
      agentType: task.assignedAgent,
      bookId,
      userMessage: task.description,
      memory,
      iteration: 0,
    });

    // Update task as completed
    await db.update(agentTasks).set({
      status: "completed",
      output: loopResult.finalResponse,
      completedAt: new Date(),
    }).where(eq(agentTasks.id, dbTaskId));

    return {
      ...task,
      status: "completed",
      output: loopResult.finalResponse,
    };
  } catch (error: any) {
    await db.update(agentTasks).set({
      status: "failed",
      error: error.message,
      completedAt: new Date(),
    }).where(eq(agentTasks.id, dbTaskId));

    return { ...task, status: "failed", error: error.message };
  }
}

/**
 * THE CREW MANAGER — Executes a full crew workflow
 * 1. Plans tasks using Gemini
 * 2. Executes tasks in dependency order
 * 3. Reviews outputs
 * 4. Generates final report
 */
export async function runCrew(goal: string, bookId?: number, bookContext?: string): Promise<CrewExecution> {
  // Step 1: Plan tasks
  const plannedTasks = await planCrewTasks(goal, bookContext ?? "");

  // Assign IDs and initialize status
  const tasks: CrewTask[] = plannedTasks.map((t, i) => ({
    id: i + 1,
    description: t.description,
    assignedAgent: t.assignedAgent as any,
    status: "pending",
  }));

  // Step 2: Execute tasks (simple sequential for MVP, can be parallelized)
  for (let i = 0; i < tasks.length; i++) {
    tasks[i].status = "running";
    const result = await executeCrewTask(tasks[i], bookId);
    tasks[i] = result;
  }

  // Step 3: Generate final report
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const failedTasks = tasks.filter((t) => t.status === "failed");

  const reportPrompt = `You are the Crew Manager. Summarize the crew's work:

Goal: ${goal}
Total tasks: ${tasks.length}
Completed: ${completedTasks.length}
Failed: ${failedTasks.length}

Task outputs:
${tasks.map((t) => `Task ${t.id} (${t.assignedAgent}): ${t.status}\n${t.output ?? t.error ?? ""}`).join("\n\n")}

Provide a concise final report with key outcomes and next steps.`;

  const reportResult = await routePrompt("planner", reportPrompt, { temperature: 0.5, maxTokens: 2048 });
  const finalReport = reportResult?.text ?? "Crew execution complete.";

  return {
    crewId: Date.now(),
    goal,
    bookId,
    tasks,
    finalReport,
    completed: failedTasks.length === 0,
  };
}
