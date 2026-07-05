// ═══════════════════════════════════════════════════════════════════════════════
// FORMAL AI EXECUTION RUNTIME
// E = R[(G + C + K + T + M) → O → P → A → V → Δ → F]
// ═══════════════════════════════════════════════════════════════════════════════
// Core rule:
//   IF V = TRUE  → FINAL
//   IF V = FALSE → CORRECT + REPEAT
//   IF UNKNOWN   → OBSERVE MORE
// ═══════════════════════════════════════════════════════════════════════════════

import { routePrompt } from "../lib/model-router";
import { getDb } from "../queries/connection";
import { agentScratchPad, reflectionLog } from "@db/schema";

// ─── Type Definitions ───

export interface ExecutionContext {
  goal: string;
  situation: string;
  constraints: string[];
  tools: string[];
  memory: string;
}

export interface Observation {
  state: string;
  data: Record<string, any>;
  confidence: number; // 0-1
}

export interface Plan {
  steps: string[];
  rationale: string;
  expectedOutcome: string;
}

export interface Action {
  tool: string;
  params: Record<string, any>;
  reasoning: string;
}

export interface ActionResult {
  output: string;
  data?: Record<string, any>;
  success: boolean;
}

export interface VerificationResult {
  valid: boolean | "unknown";
  errors: string[];
  warnings: string[];
  delta?: {
    expected: string;
    actual: string;
    gap: string;
  };
  alignmentScore: number; // 0-1
}

export interface ExecutionTrace {
  phase: string;
  timestamp: Date;
  input: any;
  output: any;
  durationMs: number;
}

export interface ExecutionState {
  context: ExecutionContext;
  observation?: Observation;
  plan?: Plan;
  action?: Action;
  actionResult?: ActionResult;
  verification?: VerificationResult;
  iterations: number;
  trace: ExecutionTrace[];
  status: "running" | "verified" | "failed" | "correcting";
}

export interface ExecutionResult {
  status: "VERIFIED" | "FAILED" | "MAX_ITERATIONS";
  output: string;
  iterations: number;
  trace: ExecutionTrace[];
  finalVerification?: VerificationResult;
}

// ─── Helpers ───

function now(): Date {
  return new Date();
}

// sleep helper available if needed for async delays
// function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

async function persistThought(
  agentType: string,
  taskId: number,
  phase: string,
  thought: string,
  decision?: string,
  reasoning?: string,
  score?: number
) {
  try {
    await getDb().insert(agentScratchPad).values({
      agentType: agentType as any,
      taskId,
      thought: `[${phase}] ${thought}`,
      decision: decision ?? null,
      reasoning: reasoning ?? null,
      reflectionScore: score ?? null,
      status: "active",
    });
  } catch (e: any) {
    // Best-effort persistence
  }
}

async function persistReflection(
  agentType: string,
  taskId: number,
  decision: string,
  result: string,
  aligned: "yes" | "no" | "partial",
  correction?: string
) {
  try {
    await getDb().insert(reflectionLog).values({
      agentType: agentType as any,
      taskId,
      originalDecision: decision,
      reflectionResult: result,
      alignedWithGoal: aligned,
      correction: correction ?? null,
    });
  } catch (e: any) {
    // Best-effort persistence
  }
}

// ─── The Formal Runtime ───

export class AIExecutionRuntime {
  private readonly maxIterations: number;
  private readonly agentType: string;
  private readonly taskId: number;

  constructor(opts: { maxIterations?: number; agentType: string; taskId: number }) {
    this.maxIterations = opts.maxIterations ?? 5;
    this.agentType = opts.agentType;
    this.taskId = opts.taskId;
  }

  /**
   * G = Goal — Define the objective
   * C = Context — Current situation
   * K = Constraints — Rules and limitations
   * T = Tools — Available capabilities
   * M = Memory — Prior knowledge from scratch pad
   */
  async initialize(
    goal: string,
    situation: string,
    constraints: string[],
    tools: string[],
    memory: string
  ): Promise<ExecutionState> {
    await persistThought(
      this.agentType, this.taskId,
      "INIT",
      `Goal: ${goal}\nSituation: ${situation}\nConstraints: ${constraints.join(", ")}\nTools: ${tools.join(", ")}`,
      "Initialize execution",
      "Building execution context from (G + C + K + T + M)"
    );

    return {
      context: { goal, situation, constraints, tools, memory },
      iterations: 0,
      trace: [{
        phase: "INIT",
        timestamp: now(),
        input: { goal, situation, constraints, tools },
        output: { status: "initialized" },
        durationMs: 0,
      }],
      status: "running",
    };
  }

  /**
   * O = Observe — Gather information about current state
   */
  async observe(state: ExecutionState): Promise<Observation> {
    const start = Date.now();
    const prompt = `Observe the current situation and assess progress toward the goal.

GOAL: "${state.context.goal}"
SITUATION: "${state.context.situation}"
MEMORY: "${state.context.memory}"
${state.actionResult ? `LAST ACTION RESULT: ${state.actionResult.output}` : ""}
${state.verification ? `LAST VERIFICATION: valid=${state.verification.valid}, errors=${state.verification.errors.join("; ")}` : ""}

Provide a concise observation of the current state, including:
1. What is the current situation?
2. What progress has been made toward the goal?
3. What obstacles or gaps remain?
4. Rate your confidence (0.0-1.0)

Respond as JSON: {"state": "description", "data": {}, "confidence": 0.0-1.0}`;

    const result = await routePrompt(this.agentType, prompt, { temperature: 0.2, maxTokens: 1024 });
    let observation: Observation = {
      state: state.context.situation,
      data: {},
      confidence: 0.5,
    };

    if (result) {
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          observation = {
            state: String(parsed.state ?? state.context.situation),
            data: parsed.data ?? {},
            confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
          };
        }
      } catch { /* use default */ }
    }

    await persistThought(
      this.agentType, this.taskId,
      "OBSERVE",
      observation.state,
      `Confidence: ${observation.confidence}`,
      "Gathering information about current state"
    );

    state.trace.push({
      phase: "OBSERVE",
      timestamp: now(),
      input: state.context,
      output: observation,
      durationMs: Date.now() - start,
    });

    return observation;
  }

  /**
   * P = Plan — Create step-by-step plan
   */
  async plan(state: ExecutionState): Promise<Plan> {
    const start = Date.now();
    const prompt = `Create a step-by-step plan to achieve the goal.

GOAL: "${state.context.goal}"
CURRENT STATE: "${state.observation?.state ?? state.context.situation}"
CONSTRAINTS: ${state.context.constraints.join(", ")}
AVAILABLE TOOLS: ${state.context.tools.join(", ")}
MEMORY: "${state.context.memory}"

Create a concise plan with 3-7 steps. Each step should be actionable.

Respond as JSON: {"steps": ["step 1", "step 2", ...], "rationale": "why this plan", "expectedOutcome": "what success looks like"}`;

    const result = await routePrompt(this.agentType, prompt, { temperature: 0.3, maxTokens: 1024 });
    let plan: Plan = {
      steps: ["Analyze goal", "Select tool", "Execute", "Verify"],
      rationale: "Default plan",
      expectedOutcome: "Goal achieved",
    };

    if (result) {
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          plan = {
            steps: Array.isArray(parsed.steps) ? parsed.steps.map(String) : plan.steps,
            rationale: String(parsed.rationale ?? plan.rationale),
            expectedOutcome: String(parsed.expectedOutcome ?? plan.expectedOutcome),
          };
        }
      } catch { /* use default */ }
    }

    await persistThought(
      this.agentType, this.taskId,
      "PLAN",
      `Steps: ${plan.steps.join(" → ")}`,
      plan.rationale,
      `Expected: ${plan.expectedOutcome}`
    );

    state.trace.push({
      phase: "PLAN",
      timestamp: now(),
      input: state.observation,
      output: plan,
      durationMs: Date.now() - start,
    });

    return plan;
  }

  /**
   * A = Act — Execute the planned action using available tools
   */
  async act(state: ExecutionState, executeTool: (name: string, params: any) => Promise<ActionResult>): Promise<{ action: Action; result: ActionResult }> {
    const start = Date.now();
    const currentStep = state.plan?.steps[state.iterations] ?? state.plan?.steps[0] ?? "execute";

    const prompt = `Determine the next action to execute.

GOAL: "${state.context.goal}"
PLAN STEP: "${currentStep}"
CURRENT STATE: "${state.observation?.state ?? ""}"
AVAILABLE TOOLS: ${state.context.tools.join(", ")}

Choose ONE tool and specify parameters. If no tool is needed, use "finalize".

Respond as JSON: {"tool": "tool_name", "params": {}, "reasoning": "why this action"}`;

    const result = await routePrompt(this.agentType, prompt, { temperature: 0.2, maxTokens: 1024 });
    let action: Action = {
      tool: "think",
      params: { message: `Step ${state.iterations}: ${currentStep}` },
      reasoning: "Default action",
    };

    if (result) {
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          action = {
            tool: String(parsed.tool ?? "think"),
            params: parsed.params ?? {},
            reasoning: String(parsed.reasoning ?? ""),
          };
        }
      } catch { /* use default */ }
    }

    // Execute the tool
    let actionResult: ActionResult;
    try {
      actionResult = await executeTool(action.tool, action.params);
    } catch (e: any) {
      actionResult = { output: `Tool error: ${e.message}`, success: false };
    }

    await persistThought(
      this.agentType, this.taskId,
      "ACT",
      `Tool: ${action.tool}`,
      actionResult.success ? "Success" : "Failed",
      action.reasoning
    );

    state.trace.push({
      phase: "ACT",
      timestamp: now(),
      input: action,
      output: actionResult,
      durationMs: Date.now() - start,
    });

    return { action, result: actionResult };
  }

  /**
   * V = Verify — Check if the action achieved the expected result
   */
  async verify(state: ExecutionState): Promise<VerificationResult> {
    const start = Date.now();
    const prompt = `Verify whether the action achieved the goal.

GOAL: "${state.context.goal}"
ACTION: "${state.action?.tool}(${JSON.stringify(state.action?.params ?? {})})"
RESULT: "${state.actionResult?.output ?? "No result"}"
EXPECTED OUTCOME: "${state.plan?.expectedOutcome ?? "Goal achieved"}"

Verify against these constraints: ${state.context.constraints.join(", ")}

Respond as JSON: {"valid": true/false/"unknown", "errors": ["error1"], "warnings": ["warn1"], "alignmentScore": 0.0-1.0}`;

    const result = await routePrompt(this.agentType, prompt, { temperature: 0.1, maxTokens: 1024 });
    let verification: VerificationResult = {
      valid: state.actionResult?.success ?? false,
      errors: [],
      warnings: [],
      alignmentScore: 0.5,
    };

    if (result) {
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const v = parsed.valid;
          verification = {
            valid: v === true || v === "true" ? true : v === false || v === "false" ? false : "unknown",
            errors: Array.isArray(parsed.errors) ? parsed.errors.map(String) : [],
            warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
            alignmentScore: Math.min(1, Math.max(0, Number(parsed.alignmentScore) || 0.5)),
          };
        }
      } catch { /* use default */ }
    }

    // Self-reflection: if verification failed, log the delta
    if (verification.valid === false) {
      verification.delta = {
        expected: state.plan?.expectedOutcome ?? "Goal achieved",
        actual: state.actionResult?.output ?? "No output",
        gap: verification.errors.join("; ") || "Unknown gap",
      };
    }

    await persistReflection(
      this.agentType, this.taskId,
      `${state.action?.tool}(${JSON.stringify(state.action?.params ?? {})})`,
      `Verification: valid=${verification.valid}, score=${verification.alignmentScore}, errors=${verification.errors.join("; ")}`,
      verification.valid === true ? "yes" : verification.valid === false ? "no" : "partial",
      verification.valid === false ? `Correct: ${verification.delta?.gap}` : undefined
    );

    state.trace.push({
      phase: "VERIFY",
      timestamp: now(),
      input: state.actionResult,
      output: verification,
      durationMs: Date.now() - start,
    });

    return verification;
  }

  /**
   * Δ = Delta — Calculate difference between expected and actual
   */
  compare(state: ExecutionState): { expected: string; actual: string; gap: string } | null {
    if (!state.verification?.delta) return null;
    return state.verification.delta;
  }

  /**
   * Correct — Fix issues based on verification delta
   */
  async correct(state: ExecutionState): Promise<ExecutionState> {
    const start = Date.now();
    const delta = state.verification?.delta;

    const correctionPrompt = `The previous action did not achieve the goal. Correct the approach.

GOAL: "${state.context.goal}"
FAILED ACTION: "${state.action?.tool}"
ERROR: "${delta?.gap ?? "Unknown error"}"

Provide a corrected plan. Respond as JSON: {"correction": "what to fix", "newApproach": "how to proceed"}`;

    const result = await routePrompt(this.agentType, correctionPrompt, { temperature: 0.3, maxTokens: 512 });
    let correction = "Retry with adjusted parameters";
    if (result) {
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          correction = String(parsed.correction ?? parsed.newApproach ?? correction);
        }
      } catch { /* use default */ }
    }

    await persistThought(
      this.agentType, this.taskId,
      "CORRECT",
      `Correction applied: ${correction}`,
      "Adjust and retry",
      `Gap: ${delta?.gap ?? "unknown"}`
    );

    const newState: ExecutionState = {
      ...state,
      context: {
        ...state.context,
        memory: `${state.context.memory}\n[Correction ${state.iterations}]: ${correction}`,
      },
      iterations: state.iterations + 1,
      status: "correcting",
      trace: [...state.trace, {
        phase: "CORRECT",
        timestamp: now(),
        input: delta,
        output: { correction },
        durationMs: Date.now() - start,
      }],
    };

    return newState;
  }

  /**
   * R = Repeat — Full execution loop: (G+C+K+T+M) → O → P → A → V → Δ → F
   */
  async run(
    goal: string,
    situation: string,
    constraints: string[],
    tools: string[],
    memory: string,
    executeTool: (name: string, params: any) => Promise<ActionResult>
  ): Promise<ExecutionResult> {
    // Step 0: Initialize (G + C + K + T + M)
    let state = await this.initialize(goal, situation, constraints, tools, memory);

    // R = Repeat loop
    for (let i = 0; i < this.maxIterations; i++) {
      state.iterations = i;

      // O = Observe
      state.observation = await this.observe(state);

      // If confidence is too low, observe more
      if (state.observation.confidence < 0.3) {
        state.observation = await this.observe(state); // Double observation
      }

      // P = Plan
      state.plan = await this.plan(state);

      // A = Act
      const { action, result } = await this.act(state, executeTool);
      state.action = action;
      state.actionResult = result;

      // V = Verify
      state.verification = await this.verify(state);

      // Core rule:
      // IF V = TRUE  → FINAL
      if (state.verification.valid === true) {
        state.status = "verified";
        return {
          status: "VERIFIED",
          output: state.actionResult.output,
          iterations: i + 1,
          trace: state.trace,
          finalVerification: state.verification,
        };
      }

      // IF UNKNOWN → OBSERVE MORE (next iteration will re-observe)
      if (state.verification.valid === "unknown") {
        state.context.memory += "\n[Observation needed]: Verification was inconclusive. Re-observing.";
        continue;
      }

      // IF V = FALSE → CORRECT + REPEAT
      if (state.verification.valid === false) {
        state = await this.correct(state);
      }
    }

    // Max iterations reached without verification
    state.status = "failed";
    return {
      status: "MAX_ITERATIONS",
      output: state.actionResult?.output ?? "Execution failed after max iterations",
      iterations: state.iterations + 1,
      trace: state.trace,
      finalVerification: state.verification,
    };
  }
}
