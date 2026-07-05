// Hardened Agent Loop — E = R[(G + C + K + T + M) → O → P → A → V → Δ → F]
// Self-reflecting runtime with memory injection and decision auditing
// Uses formal AIExecutionRuntime for O→P→A→V→Δ→F cycle

import type { AgentContext, AgentLoopResult, ToolCallRecord, ToolResult } from "./types";
import { getPersona } from "./agents";
import { getToolsForAgent, TOOL_REGISTRY } from "./tools";
import { getDb } from "../queries/connection";
import { agentMessages } from "@db/schema";
import { searchMemory, writeMemory, getAgentContext, resolveAgentThoughts } from "./memory";
import { AIExecutionRuntime, type ActionResult } from "./ai-execution";

// Removed: buildHardenedPrompt(), callModel() — replaced by formal AIExecutionRuntime
// All execution now flows through O → P → A → V → Δ → F cycle

async function executeTool(name: string, params: Record<string, any>, _ctx: AgentContext): Promise<ToolResult> {
  const tool = TOOL_REGISTRY[name];
  if (!tool) return { success: false, output: `Tool "${name}" not found.` };
  return tool.execute(params, _ctx);
}

async function persistMemory(agentType: string, bookId: number | undefined, role: "user" | "agent", message: string, metadata?: any) {
  await getDb().insert(agentMessages).values({
    agentType: agentType as any, bookId: bookId ?? null, role, message,
    metadata: metadata ?? {},
  });
}

/**
 * Execute a tool and return ActionResult format for the formal runtime.
 */
async function executeToolForRuntime(name: string, params: Record<string, any>, ctx: AgentContext): Promise<ActionResult> {
  const result = await executeTool(name, params, ctx);
  return {
    output: result.output,
    data: result.data,
    success: result.success,
  };
}

/**
 * Run the hardened agent loop with full self-reflection.
 *
 * E = R[(G + C + K + T + M) → O → P → A → V → Δ → F]
 *
 * G = Goal       — user's objective
 * C = Context    — current conversation state
 * K = Knowledge  — recalled from global scratch pad
 * T = Tools      — available tool registry
 * M = Memory     — agent scratch pad (working memory)
 * O = Observe    — gather information
 * P = Plan       — decide next action via think tool
 * A = Act        — execute the chosen tool
 * V = Verify     — reflect: does this serve the goal?
 * Δ = Delta      — correct if misaligned
 * F = Finalize   — return result, persist learnings
 * R = Repeat     — until verified
 *
 * Core rule:
 *   IF V = TRUE  → FINAL
 *   IF V = FALSE → CORRECT + REPEAT
 *   IF UNKNOWN   → OBSERVE MORE
 */
export async function runHardenedAgentLoop(
  ctx: AgentContext,
  taskId: number,
  userGoal: string
): Promise<AgentLoopResult> {
  const persona = getPersona(ctx.agentType);
  if (!persona) throw new Error(`Unknown: ${ctx.agentType}`);

  // ─── Phase 0: Initialize (G + C + K + T + M) ───
  await persistMemory(ctx.agentType, ctx.bookId, "user", ctx.userMessage);

  // G = Goal
  const goal = userGoal;
  // C = Context — build with memory injection
  const situation = await buildContextWithMemory(ctx, taskId, userGoal);
  // K = Constraints
  const constraints = [
    "Must serve the user's stated goal",
    "No hallucination — ground decisions in actual data",
    "Reflect before every tool use",
    "Persist key findings to scratch pad",
    `Max ${persona.maxIterations} iterations`,
  ];
  // T = Tools
  const tools = persona.tools;
  // M = Memory — agent scratch pad working memory
  const memory = await getAgentContext(taskId) ?? "";

  // ─── Create formal runtime ───
  const runtime = new AIExecutionRuntime({
    maxIterations: persona.maxIterations,
    agentType: ctx.agentType,
    taskId,
  });

  // ─── R = Run the formal execution loop ───
  const executeToolBound = (name: string, params: any) => executeToolForRuntime(name, params, ctx);
  const result = await runtime.run(goal, situation, constraints, tools, memory, executeToolBound);

  // ─── F = Finalize ───
  const finalResponse = result.output;
  const completed = result.status === "VERIFIED";

  // Mark agent thoughts as resolved
  await resolveAgentThoughts(taskId);

  // Persist final learnings to global scratch pad
  if (finalResponse.length > 20) {
    try {
      await writeMemory(
        `Task ${taskId}: ${ctx.userMessage.substring(0, 100)}`,
        finalResponse.substring(0, 2000),
        "agent_output",
        { tags: [ctx.agentType, "completed"], source: "hardened_loop", bookId: ctx.bookId }
      );
    } catch { /* best effort */ }
  }

  await persistMemory(ctx.agentType, ctx.bookId, "agent", finalResponse, {
    iterations: result.iterations,
    completed,
    reflectionEnabled: true,
    status: result.status,
  });

  // Build ToolCallRecord[] from trace (ACT phases)
  const toolCalls: ToolCallRecord[] = result.trace
    .filter((t) => t.phase === "ACT")
    .map((t) => ({
      tool: t.input?.tool ?? "unknown",
      params: t.input?.params ?? {},
      result: {
        success: t.output?.success ?? false,
        output: t.output?.output ?? "",
        data: t.output?.data,
      } as ToolResult,
      timestamp: t.timestamp,
    }));

  return { finalResponse, toolCalls, iterations: result.iterations, completed };
}

/**
 * Build context string with full memory injection.
 * (G + C + K + T + M) — assembles all components.
 */
async function buildContextWithMemory(ctx: AgentContext, taskId: number, userGoal: string): Promise<string> {
  const persona = getPersona(ctx.agentType);
  if (!persona) return ctx.userMessage;

  // T = Tools
  const tools = getToolsForAgent(persona.tools);
  const toolDescriptions = tools.map((t) => {
    const params = Object.entries(t.parameters)
      .map(([k, v]) => `    ${k}: ${v.type}${v.required ? " (required)" : ""} — ${v.description}`)
      .join("\n");
    return `- ${t.name}: ${t.description}\n${params}`;
  }).join("\n\n");

  // M = Working memory (agent scratch pad)
  const agentMemory = await getAgentContext(taskId);

  // K = Global knowledge recall
  let recalledKnowledge = "";
  try {
    const keywords = extractKeywords(ctx.userMessage + " " + userGoal);
    const memories: Array<{ key: string; value: string }> = [];
    for (const kw of keywords.slice(0, 3)) {
      const results = await searchMemory(kw, 3);
      for (const r of results) {
        if (!memories.some((m) => m.key === r.key)) memories.push(r);
      }
    }
    if (memories.length > 0) {
      recalledKnowledge = memories.map((m) => `- ${m.key}: ${m.value}`).join("\n");
    }
  } catch { /* best effort */ }

  // C = Recent context
  const memoryContext = ctx.memory.slice(-8).map((m) => `[${m.role}] ${m.content}`).join("\n");

  return `## YOUR MISSION (G = Goal)
User's ultimate goal: "${userGoal}"
Your current task: "${ctx.userMessage}"

## AVAILABLE TOOLS (T)
${toolDescriptions}

## RECALLED KNOWLEDGE (K)
${recalledKnowledge || "No relevant prior knowledge found."}

## YOUR WORKING MEMORY (M)
${agentMemory || "No prior steps taken."}

## RECENT CONTEXT (C)
${memoryContext}

## CRITICAL CONSTRAINTS
1. Reflect before EVERY tool use
2. Ground decisions in actual data — no hallucination
3. Each step must serve the user's GOAL
4. After executing tools, summarize findings and persist key insights

Respond naturally. Use tools when needed. Provide final summary when done.`;
}

/**
 * Extract keywords from text for memory search.
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "to", "of", "and", "in", "on", "at", "by", "for", "with", "about", "like", "from", "up", "out", "as", "into", "through", "during", "before", "after", "above", "below", "between", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "can", "will", "just", "should", "now", "this", "that", "these", "those"]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 6);
}
