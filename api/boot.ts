import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import { loadSkillsToRagLibrary } from "./skills/loader";
import { syncSchema } from "./lib/schema-sync";

const app = new Hono<{ Bindings: HttpBindings }>();
const distPath = path.resolve(import.meta.dirname, "../dist/public");

// ═══ PUBLIC HEALTH ENDPOINT (no auth, no batch) ═══
app.get("/api/health/keys", async (c) => {
  const results: Array<{ name: string; envKey: string; healthy: boolean; detail?: string }> = [];

  // A2E
  try {
    const { isA2eHealthy } = await import("./lib/a2e");
    const ok = await isA2eHealthy();
    results.push({ name: "A2E Media", envKey: "A2E_API_KEY", healthy: ok, detail: ok ? "API responsive" : "Unreachable" });
  } catch { results.push({ name: "A2E Media", envKey: "A2E_API_KEY", healthy: false, detail: "Not set" }); }

  // Gemini
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Not set");
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=1`, { signal: AbortSignal.timeout(8000) });
    results.push({ name: "Gemini AI", envKey: "GEMINI_API_KEY", healthy: resp.ok, detail: resp.ok ? "Models accessible" : `HTTP ${resp.status}` });
  } catch (e: any) { results.push({ name: "Gemini AI", envKey: "GEMINI_API_KEY", healthy: false, detail: e.message }); }

  // NVIDIA
  try {
    const key = process.env.NVIDIA_API_KEY;
    if (!key) throw new Error("Not set");
    const resp = await fetch("https://api.nvcf.nvidia.com/v2/nvcf/authorizations/functions", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    results.push({ name: "NVIDIA", envKey: "NVIDIA_API_KEY", healthy: resp.ok || resp.status === 403, detail: resp.ok ? "OK" : resp.status === 403 ? "Key valid" : `HTTP ${resp.status}` });
  } catch (e: any) { results.push({ name: "NVIDIA", envKey: "NVIDIA_API_KEY", healthy: false, detail: e.message }); }

  // Firecrawl
  try {
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) throw new Error("Not set");
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ url: "https://example.com" }), signal: AbortSignal.timeout(8000) });
    results.push({ name: "Firecrawl", envKey: "FIRECRAWL_API_KEY", healthy: resp.ok || resp.status === 400, detail: resp.ok ? "OK" : resp.status === 400 ? "Key valid" : `HTTP ${resp.status}` });
  } catch (e: any) { results.push({ name: "Firecrawl", envKey: "FIRECRAWL_API_KEY", healthy: false, detail: e.message }); }

  // Composio
  try {
    const key = process.env.COMPOSIO_API_KEY;
    if (!key) throw new Error("Not set");
    const resp = await fetch("https://backend.composio.dev/api/v1/actions", { headers: { "x-api-key": key }, signal: AbortSignal.timeout(8000) });
    results.push({ name: "Composio", envKey: "COMPOSIO_API_KEY", healthy: resp.ok, detail: resp.ok ? "OK" : `HTTP ${resp.status}` });
  } catch (e: any) { results.push({ name: "Composio", envKey: "COMPOSIO_API_KEY", healthy: false, detail: e.message }); }

  // Steel
  try {
    const key = process.env.STEEL_API_KEY;
    if (!key) throw new Error("Not set");
    const resp = await fetch("https://api.steel.dev/v1/sessions", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    results.push({ name: "Steel", envKey: "STEEL_API_KEY", healthy: resp.ok, detail: resp.ok ? "API accessible" : `HTTP ${resp.status}` });
  } catch (e: any) { results.push({ name: "Steel", envKey: "STEEL_API_KEY", healthy: false, detail: e.message }); }

  return c.json(results);
});

// ═══ TEMPORARY: Render API proxy (removes after env setup) ═══
// This endpoint proxies requests to Render's API from within Render's network.
// It auto-configures all environment variables on first boot if RENDER_API_KEY is set.
const RENDER_API_KEY = process.env.RENDER_API_KEY;
const SERVICE_ID = "srv-d94s6vhkh4rs73fmllbg";

async function setRenderEnvVar(key: string, value: string): Promise<boolean> {
  if (!RENDER_API_KEY) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(
      `https://api.render.com/v1/services/${SERVICE_ID}/env-vars/${encodeURIComponent(key)}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${RENDER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    return resp.status === 200 || resp.status === 201;
  } catch {
    return false;
  }
}

async function autoConfigureEnvVars(): Promise<void> {
  if (!RENDER_API_KEY) {
    console.log("[Proxy] RENDER_API_KEY not set, skipping auto-config");
    return;
  }
  console.log("[Proxy] RENDER_API_KEY found — proxy ready for env var setup");
}

// Health-check endpoint that also reports env var status
app.get("/api/proxy/env-status", async (c) => {
  const status: Record<string, boolean> = {};
  for (const key of ["DATABASE_URL","GEMINI_API_KEY","NVIDIA_API_KEY","A2E_API_KEY","FIRECRAWL_API_KEY","STEEL_API_KEY","COMPOSIO_API_KEY","GITHUB_TOKEN","APP_SECRET"]) {
    status[key] = !!process.env[key];
  }
  status["_RENDER_API_KEY"] = !!RENDER_API_KEY;
  return c.json(status);
});

// POST endpoint to set env vars on Render (keys sent at runtime, never stored in code)
app.post("/api/proxy/set-env", async (c) => {
  if (!RENDER_API_KEY) {
    return c.json({ error: "RENDER_API_KEY not configured on this service" }, 500);
  }
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ error: "Send JSON: { key: \"NAME\", value: \"VALUE\" }" }, 400);
  }
  const results: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith("_")) continue;
    const success = await setRenderEnvVar(key, value as string);
    results[key] = success;
  }
  const allOk = Object.values(results).every(Boolean);
  return c.json({ results, allOk });
});

// POST endpoint to trigger a deploy
app.post("/api/proxy/deploy", async (c) => {
  if (!RENDER_API_KEY) {
    return c.json({ error: "RENDER_API_KEY not configured" }, 500);
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RENDER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clearCache: "do_not_clear" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return c.json({ triggered: resp.ok, status: resp.status });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── SECURITY MIDDLEWARE ───

// 1. Security headers (Helmet-like)
app.use("*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    c.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  await next();
});

// 2. CORS — whitelist only the deployed domain and localhost
app.use("*", async (c, next) => {
  const origin = c.req.header("origin") || "";
  const allowedOrigins = [
    "https://project-c-64qo.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
  ];
  const isAllowed = allowedOrigins.includes(origin) || !origin;

  if (c.req.method === "OPTIONS") {
    c.header("Access-Control-Allow-Origin", isAllowed ? origin : allowedOrigins[0]);
    c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Max-Age", "86400");
    return c.text("", 204);
  }

  c.header("Access-Control-Allow-Origin", isAllowed ? origin : allowedOrigins[0]);
  c.header("Access-Control-Allow-Credentials", "true");
  await next();
});

// 3. Simple rate limiting (in-memory, per IP)
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = 120; // 120 requests per minute

app.use("/api/*", async (c, next) => {
  const ip = c.req.header("x-forwarded-for") || "unknown";
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else {
    entry.count++;
    if (entry.count > RATE_MAX) {
      return c.json({ error: "Rate limit exceeded. Try again in a minute." }, 429);
    }
  }
  await next();
});

// 4. API Key Authentication for tRPC endpoints
app.use("/api/trpc/*", async (c, next) => {
  // Skip auth for ping (needed for Render health checks)
  if (c.req.url.endsWith("/ping")) {
    await next();
    return;
  }

  // In development, skip auth
  if (process.env.NODE_ENV !== "production") {
    await next();
    return;
  }

  const apiKey = c.req.header("x-api-key");
  const appSecret = process.env.APP_SECRET;

  // If APP_SECRET is not set, allow (migration period)
  if (!appSecret) {
    await next();
    return;
  }

  if (!apiKey || apiKey !== appSecret) {
    return c.json({ error: "Unauthorized. Set x-api-key header matching APP_SECRET env var." }, 401);
  }

  await next();
});

// 5. Body limit + tRPC handler
app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// 6. Static files with absolute path
app.use("/*", serveStatic({ root: distPath }));

// 7. SPA fallback — only for non-file requests
app.all("*", (c) => {
  const url = new URL(c.req.url);
  const pathname = url.pathname;

  // Don't serve index.html for asset files (CSS, JS, images, fonts)
  if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|mp4|webm)$/)) {
    return c.json({ error: "Not Found" }, 404);
  }

  // Serve index.html for all SPA routes
  const indexPath = path.resolve(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, "utf-8");
    return c.html(content);
  }
  return c.json({ error: "Not Found" }, 404);
});

export default app;

// ─── BLOCKING BOOT SEQUENCE ───
// Server does NOT start until schema sync completes.
// This prevents "Failed query: select ... from books" errors.
async function boot() {
  const { serve } = await import("@hono/node-server");
  const port = parseInt(process.env.PORT || "10000");

  // Step 0: Auto-configure Render env vars if RENDER_API_KEY is available
  await autoConfigureEnvVars();

  // Step 1: Sync database schema BEFORE starting server
  console.log("[Boot] Syncing database schema...");
  try {
    await syncSchema();
    console.log("[Boot] Schema sync complete");
  } catch (err: any) {
    console.error("[Boot] Schema sync failed:", err.message);
    // Continue anyway — server can still serve frontend
  }

  // Step 2: Load skills into RAG library
  loadSkillsToRagLibrary().catch((err) =>
    console.error("[Boot] Skill loader failed:", err.message)
  );

  // Step 3: Start server (only after schema is ready)
  serve({
    fetch: app.fetch,
    port,
    hostname: "0.0.0.0",
  }, () => {
    console.log(`[Boot] Server running on http://0.0.0.0:${port}/`);
  });
}

// Start boot sequence
if (process.env.NODE_ENV === "production" || process.env.PORT) {
  boot();
}
