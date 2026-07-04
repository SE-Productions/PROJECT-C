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

// 2. Static files with absolute path
app.use("/*", serveStatic({ root: distPath }));

// 3. SPA fallback — only for non-file requests
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
    // Load skills into RAG library on boot
    loadSkillsToRagLibrary().catch((err) =>
      console.error("[Boot] Skill loader failed:", err.message)
    );
  });
}
