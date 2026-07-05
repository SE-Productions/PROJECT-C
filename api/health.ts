import { createRouter, publicQuery } from "./middleware";
import { isA2eHealthy } from "./lib/a2e";

interface KeyHealth {
  name: string;
  envKey: string;
  healthy: boolean;
  detail?: string;
}

export const healthRouter = createRouter({
  checkKeys: publicQuery.query(async () => {
    const results: KeyHealth[] = [];

    // ── A2E Media ──
    try {
      const a2eHealthy = await isA2eHealthy();
      results.push({
        name: "A2E Media",
        envKey: "A2E_API_KEY",
        healthy: a2eHealthy,
        detail: a2eHealthy ? "API responsive" : "API unreachable",
      });
    } catch {
      results.push({ name: "A2E Media", envKey: "A2E_API_KEY", healthy: false, detail: "Check failed" });
    }

    // ── Gemini ──
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) throw new Error("Not set");
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}&pageSize=1`,
        { signal: AbortSignal.timeout(8000) }
      );
      results.push({
        name: "Gemini AI",
        envKey: "GEMINI_API_KEY",
        healthy: resp.ok,
        detail: resp.ok ? "Models accessible" : `HTTP ${resp.status}`,
      });
    } catch (e: any) {
      results.push({ name: "Gemini AI", envKey: "GEMINI_API_KEY", healthy: false, detail: e.message });
    }

    // ── NVIDIA ──
    try {
      const nvKey = process.env.NVIDIA_API_KEY;
      if (!nvKey) throw new Error("Not set");
      // Lightweight: just check the auth endpoint
      const resp = await fetch("https://api.nvcf.nvidia.com/v2/nvcf/authorizations/functions", {
        headers: { Authorization: `Bearer ${nvKey}` },
        signal: AbortSignal.timeout(8000),
      });
      results.push({
        name: "NVIDIA",
        envKey: "NVIDIA_API_KEY",
        healthy: resp.ok || resp.status === 403, // 403 = key valid but no authz, still means key works
        detail: resp.ok ? "API accessible" : resp.status === 403 ? "Key valid" : `HTTP ${resp.status}`,
      });
    } catch (e: any) {
      results.push({ name: "NVIDIA", envKey: "NVIDIA_API_KEY", healthy: false, detail: e.message });
    }

    // ── Firecrawl ──
    try {
      const fcKey = process.env.FIRECRAWL_API_KEY;
      if (!fcKey) throw new Error("Not set");
      const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${fcKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com" }),
        signal: AbortSignal.timeout(8000),
      });
      results.push({
        name: "Firecrawl",
        envKey: "FIRECRAWL_API_KEY",
        healthy: resp.ok || resp.status === 400, // 400 = key valid but bad URL format
        detail: resp.ok ? "API accessible" : resp.status === 400 ? "Key valid" : `HTTP ${resp.status}`,
      });
    } catch (e: any) {
      results.push({ name: "Firecrawl", envKey: "FIRECRAWL_API_KEY", healthy: false, detail: e.message });
    }

    // ── Composio ──
    try {
      const compKey = process.env.COMPOSIO_API_KEY;
      if (!compKey) throw new Error("Not set");
      const resp = await fetch("https://backend.composio.dev/api/v1/actions", {
        headers: { "x-api-key": compKey },
        signal: AbortSignal.timeout(8000),
      });
      results.push({
        name: "Composio",
        envKey: "COMPOSIO_API_KEY",
        healthy: resp.ok || resp.status === 401, // 401 = key valid but needs setup
        detail: resp.ok ? "API accessible" : resp.status === 401 ? "Key valid" : `HTTP ${resp.status}`,
      });
    } catch (e: any) {
      results.push({ name: "Composio", envKey: "COMPOSIO_API_KEY", healthy: false, detail: e.message });
    }

    // ── Steel ──
    try {
      const stKey = process.env.STEEL_API_KEY;
      if (!stKey) throw new Error("Not set");
      const resp = await fetch("https://api.steel.dev/v1/sessions", {
        headers: { Authorization: `Bearer ${stKey}` },
        signal: AbortSignal.timeout(8000),
      });
      results.push({
        name: "Steel",
        envKey: "STEEL_API_KEY",
        healthy: resp.ok,
        detail: resp.ok ? "API accessible" : `HTTP ${resp.status}`,
      });
    } catch (e: any) {
      results.push({ name: "Steel", envKey: "STEEL_API_KEY", healthy: false, detail: e.message });
    }

    return results;
  }),
});
