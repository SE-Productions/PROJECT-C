// Reflection Engine — Self-reflection with decision alignment checking
// E = R[(G + C + K + T + M) → O → P → A → V → Δ → F]
import { getDb } from "../queries/connection";
import { reflectionLog } from "@db/schema";
import { routeGeneral } from "../lib/model-router";

interface ReflectionInput {
  agentType: string;
  taskId: number;
  userGoal: string;
  originalDecision: string;
  currentContext: string;
  availableTools: string[];
}

interface ReflectionResult {
  aligned: "yes" | "no" | "partial";
  score: number;
  analysis: string;
  correction?: string;
  shouldContinue: boolean;
}

/**
 * Reflect on a decision before executing it.
 * Uses multi-model router — falls through models if one is rate-limited.
 */
export async function reflectOnDecision(input: ReflectionInput): Promise<ReflectionResult> {
  const prompt = `You are a strict self-reflection system for an AI agent. Your job is to audit decisions.

USER GOAL: "${input.userGoal}"
AGENT TYPE: ${input.agentType}
AGENT DECISION: "${input.originalDecision}"
CURRENT CONTEXT:
${input.currentContext}

Available tools: ${input.availableTools.join(", ")}

Evaluate this decision against these criteria:
1. ALIGNMENT — Does this decision directly serve the user's goal?
2. EFFICIENCY — Is this the most direct path to the goal?
3. TOOL CORRECTNESS — Is the right tool being used?
4. HALLUCINATION CHECK — Is the decision grounded in actual data/context?

Respond ONLY with valid JSON:
{
  "aligned": "yes|no|partial",
  "score": 0.0-1.0,
  "analysis": "your reasoning",
  "correction": "if misaligned, suggest the correct approach",
  "shouldContinue": true|false
}`;

  const result = await routeGeneral(prompt, { temperature: 0.1, maxTokens: 1024 });
  if (!result) return fallbackReflection(input);

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackReflection(input);
    const parsed = JSON.parse(jsonMatch[0]);

    const r: ReflectionResult = {
      aligned: ["yes", "no", "partial"].includes(parsed.aligned) ? parsed.aligned : "partial",
      score: Math.min(1, Math.max(0, Number(parsed.score) || 0.5)),
      analysis: String(parsed.analysis ?? "No analysis provided."),
      correction: parsed.correction ?? undefined,
      shouldContinue: parsed.aligned === "yes" || parsed.shouldContinue === true,
    };

    await persistReflection(input, r);
    return r;
  } catch {
    return fallbackReflection(input);
  }
}

/**
 * Post-execution reflection: Did the action produce the expected result?
 */
export async function reflectOnResult(
  _agentType: string,
  _taskId: number,
  userGoal: string,
  actionTaken: string,
  result: string
): Promise<{ aligned: "yes" | "no" | "partial"; feedback: string }> {
  const prompt = `Audit this completed action:

User goal: "${userGoal}"
Action taken: "${actionTaken}"
Result: "${result}"

Did the result satisfy the user's goal? Is the output complete and accurate?
Respond with JSON: {"aligned": "yes|no|partial", "feedback": "explanation"}`;

  const resp = await routeGeneral(prompt, { temperature: 0.1, maxTokens: 512 });
  if (!resp) return { aligned: "partial", feedback: "Reflection service unavailable (all models exhausted)." };

  try {
    const jsonMatch = resp.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { aligned: "partial", feedback: "Parse error." };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      aligned: ["yes", "no", "partial"].includes(parsed.aligned) ? parsed.aligned : "partial",
      feedback: String(parsed.feedback ?? "No feedback."),
    };
  } catch {
    return { aligned: "partial", feedback: "Reflection failed." };
  }
}

async function persistReflection(input: ReflectionInput, result: ReflectionResult) {
  try {
    const db = getDb();
    await db.insert(reflectionLog).values({
      agentType: input.agentType as any,
      taskId: input.taskId,
      originalDecision: input.originalDecision,
      reflectionResult: result.analysis,
      alignedWithGoal: result.aligned,
      correction: result.correction ?? null,
    });
  } catch (e: any) {
    console.warn("[Reflection] Failed to persist:", e.message);
  }
}

function fallbackReflection(_input: ReflectionInput): ReflectionResult {
  return {
    aligned: "partial",
    score: 0.5,
    analysis: "Reflection engine unavailable (all models exhausted). Proceeding with caution.",
    shouldContinue: true,
  };
}
