import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";

export const searchRouter = createRouter({
  webSearch: authedQuery
    .input(z.object({
      query: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      try {
        const response = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: input.query,
            limit: 5,
          }),
        });

        if (!response.ok) {
          throw new Error(`Firecrawl error: ${response.status}`);
        }

        const data = await response.json() as any;
        return {
          results: data.data?.map((r: any) => ({
            title: r.title ?? "",
            url: r.url ?? "",
            snippet: r.description ?? r.content ?? "",
          })) ?? [],
        };
      } catch (error: any) {
        return {
          results: [],
          error: error.message ?? "Search failed",
        };
      }
    }),

  scrape: authedQuery
    .input(z.object({
      url: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      try {
        const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: input.url,
            formats: ["markdown"],
          }),
        });

        if (!response.ok) {
          throw new Error(`Firecrawl error: ${response.status}`);
        }

        const data = await response.json() as any;
        return {
          content: data.data?.markdown ?? "",
          title: data.data?.metadata?.title ?? "",
        };
      } catch (error: any) {
        return {
          content: "",
          error: error.message ?? "Scrape failed",
        };
      }
    }),
});
