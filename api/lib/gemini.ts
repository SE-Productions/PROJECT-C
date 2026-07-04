// Resilient Gemini Client — Retry + Circuit Breaker + Rate Limit Throttling
// Handles 429 (rate limit) gracefully across all API consumers

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ─── Circuit Breaker State ───
interface CircuitState {
  failures: number;
  lastFailure: number;
  open: boolean;
}

const circuit: CircuitState = { failures: 0, lastFailure: 0, open: false };
const CIRCUIT_THRESHOLD = 5;     // Open after 5 consecutive failures
const CIRCUIT_TIMEOUT = 30000;   // Try again after 30s
const MAX_RETRIES = 3;
const BASE_DELAY = 2000;         // Start with 2s backoff

// ─── Simple in-memory request queue for rate limiting ───
let lastRequestTime = 0;
const MIN_INTERVAL = 500;        // Minimum 500ms between requests (free tier safety)

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL) {
    await sleep(MIN_INTERVAL - elapsed);
  }
  lastRequestTime = Date.now();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isCircuitOpen(): boolean {
  if (!circuit.open) return false;
  if (Date.now() - circuit.lastFailure > CIRCUIT_TIMEOUT) {
    // Half-open: allow one request through
    circuit.open = false;
    circuit.failures = 0;
    return false;
  }
  return true;
}

function recordSuccess() {
  circuit.failures = 0;
  circuit.open = false;
}

function recordFailure() {
  circuit.failures++;
  circuit.lastFailure = Date.now();
  if (circuit.failures >= CIRCUIT_THRESHOLD) {
    circuit.open = true;
  }
}

/**
 * Call Gemini with automatic retry on 429, circuit breaker, and throttling.
 * Returns null if the circuit is open or all retries exhausted.
 */
export async function callGemini(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number; timeout?: number } = {}
): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  if (isCircuitOpen()) {
    console.warn("[Gemini] Circuit breaker OPEN — skipping request");
    return null;
  }

  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? 4096;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await throttle();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout ?? 15000);

      const resp = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 429 Rate Limit
      if (resp.status === 429) {
        const delay = BASE_DELAY * Math.pow(2, attempt); // 2s, 4s, 8s
        console.warn(`[Gemini] 429 on attempt ${attempt + 1}/${MAX_RETRIES}. Backoff ${delay}ms`);
        await sleep(delay);
        continue; // Retry
      }

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.warn(`[Gemini] HTTP ${resp.status}: ${text.substring(0, 200)}`);
        recordFailure();
        return null;
      }

      const data = (await resp.json()) as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

      if (!text) {
        recordFailure();
        return null;
      }

      recordSuccess();
      return text;
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.warn("[Gemini] Request timeout");
      } else {
        console.warn(`[Gemini] Error: ${err.message}`);
      }
      recordFailure();

      if (attempt < MAX_RETRIES - 1) {
        await sleep(BASE_DELAY * Math.pow(2, attempt));
      }
    }
  }

  console.error("[Gemini] All retries exhausted");
  return null;
}

/**
 * Quick health check — returns true if circuit is closed and API key is set.
 */
export function isGeminiHealthy(): boolean {
  return !!GEMINI_API_KEY && !circuit.open;
}

/**
 * Get circuit status for monitoring.
 */
export function getGeminiCircuitStatus(): { open: boolean; failures: number; lastFailure: number } {
  return { ...circuit };
}
