import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

const app = new Hono<{ Bindings: HttpBindings }>();
const distPath = path.resolve(import.meta.dirname, "../dist/public");

// 1. API routes first
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

// 2. Static files
app.use("*", serveStatic({ root: "./dist/public" }));

// 3. SPA fallback — serve index.html for all non-API routes
app.all("*", (c) => {
  const indexPath = path.resolve(distPath, "index.html");
  const content = fs.readFileSync(indexPath, "utf-8");
  return c.html(content);
});

export default app;

// Start server
if (process.env.NODE_ENV === "production" || process.env.PORT) {
  const { serve } = await import("@hono/node-server");
  const port = parseInt(process.env.PORT || "10000");
  serve({
    fetch: app.fetch,
    port,
    hostname: "0.0.0.0",
  }, () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}
