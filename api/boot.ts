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
  // Skip auth for health check
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
