// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-MODEL AI ROUTER — Intelligent Model Selection + Automatic Fallback
// ═══════════════════════════════════════════════════════════════════════════════
// Available engines:
//   - Gemini 2.0 Flash (Google) — fast, free tier, creative
//   - NVIDIA Llama 3.1 70B Instruct — strongest reasoning
//   - NVIDIA Llama 3.1 8B Instruct — fast, efficient
//   - NVIDIA Mixtral 8x7B Instruct — diverse capabilities
//   - NVIDIA Mistral 7B Instruct — lightweight
// ═══════════════════════════════════════════════════════════════════════════════

// ─── API Keys ───
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

// ─── Engine Configurations ───
export interface ModelConfig {
  id: string;
  name: string;
  provider: "gemini" | "nvidia";
  endpoint: string;
  modelParam: string;
  strengths: string[];
  maxTokens: number;
  costTier: "free" | "low" | "medium";
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "gemini-flash",
    name: "Gemini 2.0 Flash",
    provider: "gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    modelParam: "gemini-2.0-flash",
    strengths: ["fast", "creative", "multilingual", "coding", "summarization"],
    maxTokens: 8192,
    costTier: "free",
  },
  {
    id: "nvidia-llama-70b",
    name: "Llama 3.1 70B Instruct",
    provider: "nvidia",
    endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    modelParam: "meta/llama-3.1-70b-instruct",
    strengths: ["reasoning", "analysis", "planning", "complex-tasks", "instruction-following"],
    maxTokens: 4096,
    costTier: "low",
  },
  {
    id: "nvidia-llama-8b",
    name: "Llama 3.1 8B Instruct",
    provider: "nvidia",
    endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    modelParam: "meta/llama-3.1-8b-instruct",
    strengths: ["fast", "efficient", "simple-tasks", "classification", "formatting"],
    maxTokens: 4096,
    costTier: "free",
  },
  {
    id: "nvidia-mixtral-8x7b",
    name: "Mixtral 8x7B Instruct",
    provider: "nvidia",
    endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    modelParam: "mistralai/mixtral-8x7b-instruct-v0.1",
    strengths: ["diverse", "writing", "chat", "knowledge"],
    maxTokens: 4096,
    costTier: "low",
  },
  {
    id: "nvidia-mistral-7b",
    name: "Mistral 7B Instruct",
    provider: "nvidia",
    endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    modelParam: "mistralai/mistral-7b-instruct-v0.2",
    strengths: ["lightweight", "quick-replies", "simple-queries"],
    maxTokens: 4096,
    costTier: "free",
  },
];

// ─── Agent → Model Assignment ───
// Each agent gets a primary model + fallback chain
export const AGENT_MODEL_ASSIGNMENTS: Record<string, { primary: string; fallbacks: string[] }> = {
  planner: { primary: "nvidia-llama-70b", fallbacks: ["gemini-flash", "nvidia-mixtral-8x7b", "nvidia-llama-8b"] },
  search:  { primary: "gemini-flash",    fallbacks: ["nvidia-llama-8b", "nvidia-mistral-7b"] },
  media:   { primary: "gemini-flash",    fallbacks: ["nvidia-mixtral-8x7b", "nvidia-llama-8b"] },
  social:  { primary: "gemini-flash",    fallbacks: ["nvidia-mixtral-8x7b", "nvidia-mistral-7b", "nvidia-llama-8b"] },
};

// ─── Per-Model Circuit Breakers ───
interface ModelCircuit {
  failures: number;
  lastFailure: number;
  open: boolean;
}

const circuits: Record<string, ModelCircuit> = {};
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_TIMEOUT = 30000;
const MAX_RETRIES = 2;
const BASE_DELAY = 1500;

function getCircuit(modelId: string): ModelCircuit {
  if (!circuits[modelId]) circuits[modelId] = { failures: 0, lastFailure: 0, open: false };
  return circuits[modelId];
}

function isCircuitOpen(circuit: ModelCircuit): boolean {
  if (!circuit.open) return false;
  if (Date.now() - circuit.lastFailure > CIRCUIT_TIMEOUT) {
    circuit.open = false;
    circuit.failures = 0;
    return false;
  }
  return true;
}

function recordCircuitSuccess(modelId: string) {
  const c = getCircuit(modelId);
  c.failures = 0;
  c.open = false;
}

function recordCircuitFailure(modelId: string) {
  const c = getCircuit(modelId);
  c.failures++;
  c.lastFailure = Date.now();
  if (c.failures >= CIRCUIT_THRESHOLD) c.open = true;
}

// ─── Throttling (global across all models) ───
let lastRequestTime = 0;
const MIN_INTERVAL = 300; // 300ms between requests

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL) await sleep(MIN_INTERVAL - elapsed);
  lastRequestTime = Date.now();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Core: Call a specific model ───
async function callModel(
  model: ModelConfig,
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string | null> {
  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? 4096;

  if (model.provider === "gemini") {
    if (!GEMINI_API_KEY) return null;
    const resp = await fetch(`${model.endpoint}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    });
    if (resp.status === 429) return "__RATE_LIMIT__";
    if (!resp.ok) return null;
    const data = (await resp.json()) as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }

  if (model.provider === "nvidia") {
    if (!NVIDIA_API_KEY) return null;
    const messages: any[] = [];
    if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
    messages.push({ role: "user", content: prompt });

    const resp = await fetch(model.endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model.modelParam,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });
    if (resp.status === 429) return "__RATE_LIMIT__";
    if (!resp.ok) return null;
    const data = (await resp.json()) as any;
    return data.choices?.[0]?.message?.content ?? null;
  }

  return null;
}

// ─── Main Router: Smart model selection with fallback chain ───
export interface RouterResult {
  text: string;
  modelUsed: string;
  modelName: string;
  provider: string;
  attempts: number;
  fromFallback: boolean;
}

/**
 * Route a prompt to the best available model for the given agent.
 * Automatic fallback chain if primary model fails or rate-limits.
 */
export async function routePrompt(
  agentType: string,
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string } = {}
): Promise<RouterResult | null> {
  const assignment = AGENT_MODEL_ASSIGNMENTS[agentType] ?? AGENT_MODEL_ASSIGNMENTS.social;
  const modelChain = [assignment.primary, ...assignment.fallbacks];

  for (let idx = 0; idx < modelChain.length; idx++) {
    const modelId = modelChain[idx];
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!model) continue;

    const circuit = getCircuit(modelId);
    if (isCircuitOpen(circuit)) {
      console.warn(`[Router] Circuit OPEN for ${model.name}, skipping`);
      continue;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      await throttle();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const text = await Promise.race([
          callModel(model, prompt, opts),
          new Promise<string | null>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 20000)
          ),
        ]);
        clearTimeout(timeoutId);

        if (text === "__RATE_LIMIT__") {
          const delay = BASE_DELAY * Math.pow(2, attempt);
          console.warn(`[Router] 429 on ${model.name} (attempt ${attempt + 1}). Backoff ${delay}ms`);
          await sleep(delay);
          continue;
        }

        if (text) {
          recordCircuitSuccess(modelId);
          return {
            text,
            modelUsed: modelId,
            modelName: model.name,
            provider: model.provider,
            attempts: attempt + 1,
            fromFallback: idx > 0,
          };
        }

        recordCircuitFailure(modelId);
      } catch (err: any) {
        console.warn(`[Router] Error on ${model.name}: ${err.message}`);
        recordCircuitFailure(modelId);
        if (attempt < MAX_RETRIES - 1) await sleep(BASE_DELAY * Math.pow(2, attempt));
      }
    }
  }

  console.error(`[Router] ALL MODELS FAILED for agent ${agentType}`);
  return null;
}

/**
 * Route without agent type — uses the best generally available model.
 */
export async function routeGeneral(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; systemPrompt?: string } = {}
): Promise<RouterResult | null> {
  // Try Gemini first (fastest), then NVIDIA models
  const chain = ["gemini-flash", "nvidia-llama-70b", "nvidia-mixtral-8x7b", "nvidia-llama-8b"];
  for (const modelId of chain) {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!model) continue;

    const circuit = getCircuit(modelId);
    if (isCircuitOpen(circuit)) continue;

    await throttle();
    try {
      const text = await callModel(model, prompt, opts);
      if (text && text !== "__RATE_LIMIT__") {
        recordCircuitSuccess(modelId);
        return { text, modelUsed: modelId, modelName: model.name, provider: model.provider, attempts: 1, fromFallback: false };
      }
    } catch { /* try next */ }
  }
  return null;
}

/**
 * Get health status of all models.
 */
export function getModelHealth(): Array<{
  id: string; name: string; provider: string; healthy: boolean; circuitOpen: boolean; failures: number;
}> {
  return AVAILABLE_MODELS.map((m) => {
    const c = getCircuit(m.id);
    const hasKey = m.provider === "gemini" ? !!GEMINI_API_KEY : !!NVIDIA_API_KEY;
    return {
      id: m.id, name: m.name, provider: m.provider,
      healthy: hasKey && !isCircuitOpen(c),
      circuitOpen: c.open, failures: c.failures,
    };
  });
}

/**
 * Get the model assignment for an agent.
 */
export function getAgentModelAssignment(agentType: string): { primary: string; fallbacks: string[] } {
  return AGENT_MODEL_ASSIGNMENTS[agentType] ?? AGENT_MODEL_ASSIGNMENTS.social;
}
