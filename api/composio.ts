import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY;
const COMPOSIO_BASE = "https://backend.composio.dev/api/v2";

async function composioFetch(path: string, opts: RequestInit = {}) {
  const resp = await fetch(`${COMPOSIO_BASE}${path}`, {
    ...opts,
    headers: {
      "x-api-key": COMPOSIO_API_KEY!,
      "Content-Type": "application/json",
      ...opts.headers,
    },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Composio ${resp.status}: ${text}`);
  }
  return resp.json();
}

export const composioRouter = createRouter({
  // List available apps from Composio
  listApps: publicQuery.query(async () => {
    if (!COMPOSIO_API_KEY) return { apps: [], error: "Composio API key not configured" };
    try {
      const data = await composioFetch("/apps?includeLocal=false") as any;
      const socialApps = (data.items ?? []).filter((a: any) =>
        ["instagram", "tiktok", "facebook", "twitter", "youtube", "reddit"].includes(
          (a.name ?? "").toLowerCase().replace(/[^a-z]/g, "")
        )
      );
      return {
        apps: socialApps.map((a: any) => ({
          name: a.name,
          key: a.key,
          description: a.description ?? "",
          logo: a.logo ?? "",
          enabled: a.enabled ?? false,
        })),
      };
    } catch (error: any) {
      return { apps: [], error: error.message };
    }
  }),

  // Get entity connections (which accounts are linked)
  getConnections: publicQuery.query(async () => {
    if (!COMPOSIO_API_KEY) return { connections: [], error: "Composio API key not configured" };
    try {
      const data = await composioFetch("/entity/default/connections?showActiveOnly=true") as any;
      return {
        connections: (data.items ?? []).map((c: any) => ({
          id: c.id,
          appName: c.appName,
          appUniqueId: c.appUniqueId,
          status: c.status,
          createdAt: c.createdAt,
        })),
      };
    } catch (error: any) {
      return { connections: [], error: error.message };
    }
  }),

  // Initiate OAuth connection
  initiateConnection: publicQuery
    .input(z.object({ appName: z.string() }))
    .mutation(async ({ input }) => {
      if (!COMPOSIO_API_KEY) throw new Error("Composio API key not configured");
      const data = await composioFetch("/entity/default/connections/initiate", {
        method: "POST",
        body: JSON.stringify({
          integrationId: input.appName.toUpperCase(),
          redirectUri: "https://aura-publishing.onrender.com/settings",
        }),
      }) as any;
      return {
        redirectUrl: data.redirectUrl ?? "",
        connectionId: data.connectionId ?? "",
      };
    }),

  // List available actions for an app
  listActions: publicQuery
    .input(z.object({ appName: z.string() }))
    .query(async ({ input }) => {
      if (!COMPOSIO_API_KEY) return { actions: [], error: "Composio API key not configured" };
      try {
        const data = await composioFetch(`/actions?appNames=${input.appName}&limit=20`) as any;
        return {
          actions: (data.items ?? []).map((a: any) => ({
            name: a.name,
            displayName: a.displayName ?? a.name,
            description: a.description ?? "",
            tags: a.tags ?? [],
          })),
        };
      } catch (error: any) {
        return { actions: [], error: error.message };
      }
    }),

  // Execute an action
  executeAction: publicQuery
    .input(z.object({
      actionName: z.string(),
      params: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ input }) => {
      if (!COMPOSIO_API_KEY) throw new Error("Composio API key not configured");
      const data = await composioFetch("/entity/default/actions/execute", {
        method: "POST",
        body: JSON.stringify({
          actionName: input.actionName,
          input: input.params,
          entityId: "default",
        }),
      }) as any;
      return data;
    }),
});
