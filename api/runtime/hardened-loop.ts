// Hardened Agent Loop — E = R[(G + C + K + T + M) → O → P → A → V → Δ → F]
// Self-reflecting runtime with memory injection and decision auditing

import type { AgentContext, AgentLoopResult, ToolCallRecord, ToolResult } from "./types";
import { getPersona } from "./agents";
import { getToolsForAgent, TOOL_REGISTRY } from "./tools";
import { getDb } from "../queries/connection";
import { agentMessages } from "@db/schema";
import { searchMemory, writeMemory, writeAgentThought, getAgentContext, resolveAgentThoughts } from "./memory";
import { reflectOnDecision, reflectOnResult } from "./reflection";
import { routePrompt } from "../lib/model-router";

interface ModelResponse {
  text: string;
  toolCalls: Array<{ name: string; params: Record<string, any> }>;
}

function parseToolCalls(text: string): { cleanText: string; toolCalls: Array<{ name: string; params: Record<string, any> }> } {
  const toolCallRegex = /<tool\s+name="([^"]+)">\s*(\{[^]*?\})\s*<\/tool>/g;
  const toolCalls: Array<{ name: string; params: Record<string, any> }> = [];
  let match: RegExpExecArray | null;
  while ((match = toolCallRegex.exec(text)) !== null) {
    try { toolCalls.push({ name: match[1], params: JSON.parse(match[2]) }); } catch { /* skip */ }
  }
  return { cleanText: text.replace(toolCallRegex, "").trim(), toolCalls };
}

/**
 * Build the hardened prompt with full memory injection.
 * Formula: (G + C + K + T + M) — Goal + Context + Knowledge + Tools + Memory
 */
async function buildHardenedPrompt(ctx: AgentContext, taskId: number, userGoal: string): Promise<string> {
  const persona = getPersona(ctx.agentType);
  if (!persona) throw new Error(`Unknown agent: ${ctx.agentType}`);

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

  // K = Global knowledge recall — search scratch pad for relevant memories
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
  } catch { /* knowledge recall is best-effort */ }

  // G = Goal, C = Context from recent messages
  const memoryContext = ctx.memory.slice(-8).map((m) => `[${m.role}] ${m.content}`).join("\n");

  return `${persona.systemPrompt}

## YOUR MISSION (G = Goal)
User's ultimate goal: "${userGoal}"
Your current task: "${ctx.userMessage}"

## AVAILABLE TOOLS (T)
Use: <tool name="tool_name">{"param": "value"}</tool>

${toolDescriptions}

## RECALLED KNOWLEDGE (K)
${recalledKnowledge || "No relevant prior knowledge found."}

## YOUR WORKING MEMORY (M)
${agentMemory || "No prior steps taken."}

## RECENT CONTEXT (C)
${memoryContext}

## CRITICAL INSTRUCTIONS
1. Reflect before EVERY tool use. Call the "think" tool first to reason through your plan.
2. Ground decisions in actual data — no hallucination.
3. Each step must serve the user's GOAL above.
4. After executing tools, summarize findings and persist key insights.

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

async function callModel(agentType: string, prompt: string, temperature: number): Promise<ModelResponse> {
  const result = await routePrompt(agentType, prompt, { temperature, maxTokens: 4096 });
  if (!result) {
    return { text: "All AI models are currently unavailable. Please try again in a moment.", toolCalls: [] };
  }
  const { cleanText, toolCalls } = parseToolCalls(result.text);
  return { text: cleanText, toolCalls };
}

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
 */
export async function runHardenedAgentLoop(
  ctx: AgentContext,
  taskId: number,
  userGoal: string
): Promise<AgentLoopResult> {
  const persona = getPersona(ctx.agentType);
  if (!persona) throw new Error(`Unknown: ${ctx.agentType}`);

  const toolCalls: ToolCallRecord[] = [];
  let finalResponse = "";
  let completed = false;

  // O = Observe — persist user's message
  await persistMemory(ctx.agentType, ctx.bookId, "user", ctx.userMessage);
  await writeAgentThought(ctx.agentType, taskId, `Received task: ${ctx.userMessage}`, "Analyze and execute", "Observing user's request");

  for (let iteration = 0; iteration < persona.maxIterations; iteration++) {
    ctx.iteration = iteration;

    // (G + C + K + T + M) — Build prompt with full memory injection
    const prompt = await buildHardenedPrompt(ctx, taskId, userGoal);
    const modelResp = await callModel(ctx.agentType, prompt, persona.temperature);

    // No tool calls — agent is done, finalize
    if (modelResp.toolCalls.length === 0) {
      finalResponse = modelResp.text;
      completed = true;
      break;
    }

    // P + A + V + Δ — For each tool call: reflect, execute, verify
    for (const tc of modelResp.toolCalls) {
      // Skip reflection for the "think" tool itself (it's the reflection)
      if (tc.name !== "think") {
        // V = Verify — Pre-execution reflection
        const currentContext = await getAgentContext(taskId);
        const reflection = await reflectOnDecision({
          agentType: ctx.agentType,
          taskId,
          userGoal,
          originalDecision: `Use tool "${tc.name}" with params: ${JSON.stringify(tc.params)}`,
          currentContext: `Iteration ${iteration}. Agent context:\n${currentContext}`,
          availableTools: persona.tools,
        });

        // Write reflection to agent scratch pad
        await writeAgentThought(
          ctx.agentType, taskId,
          `Pre-execution check for ${tc.name}`,
          reflection.aligned === "yes" ? "Proceed" : reflection.aligned === "no" ? "Reject" : "Proceed with caution",
          `Reflection score: ${reflection.score}. ${reflection.analysis}`
        );

        // Δ = Delta — Self-correct if reflection says no
        if (!reflection.shouldContinue && reflection.aligned === "no" && reflection.correction) {
          ctx.memory.push({
            timestamp: new Date(), role: "system",
            content: `Self-correction: ${reflection.correction}`,
            metadata: { reflectionScore: reflection.score },
          });
          await writeAgentThought(ctx.agentType, taskId, "Self-correction applied", reflection.correction, "Reflecting on misalignment");
          continue; // Skip this tool call, let the model retry on next iteration
        }
      }

      // A = Act — Execute the tool
      const result = await executeTool(tc.name, tc.params, ctx);
      toolCalls.push({ tool: tc.name, params: tc.params, result, timestamp: new Date() });

      // Write to agent scratch pad for working memory
      await writeAgentThought(
        ctx.agentType, taskId,
        `Executed ${tc.name}`,
        result.success ? "Success" : "Failed",
        result.output.substring(0, 500)
      );

      // Add to context memory
      ctx.memory.push({
        timestamp: new Date(), role: "agent",
        content: `[${tc.name}] ${result.output}`,
        metadata: result.data,
      });

      // Persist key findings to global scratch pad (RAG memory)
      if (result.success && tc.name === "web_search" && result.output.length > 50) {
        try {
          await writeMemory(
            `Search: ${tc.params.query ?? ctx.userMessage}`,
            result.output.substring(0, 2000),
            "research",
            { tags: [ctx.agentType, "auto"], source: "web_search", bookId: ctx.bookId }
          );
        } catch { /* best effort */ }
      }

      // Post-execution reflection
      if (tc.name !== "think") {
        await reflectOnResult(ctx.agentType, taskId, userGoal, `${tc.name}(${JSON.stringify(tc.params)})`, result.output);
      }

      if (modelResp.text) finalResponse = modelResp.text;
    }
  }

  // F = Finalize
  if (!completed && !finalResponse) {
    finalResponse = `Executed ${toolCalls.length} tool(s) with self-reflection:\n` +
      toolCalls.map((tc, i) => `${i + 1}. **${tc.tool}**: ${tc.result.success ? "✅" : "❌"} ${tc.result.output}`).join("\n");
  }

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
    iterations: toolCalls.length, completed, reflectionEnabled: true,
  });

  return { finalResponse, toolCalls, iterations: toolCalls.length, completed };
}
