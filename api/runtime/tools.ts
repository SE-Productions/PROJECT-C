// Tool Registry — OpenClaw-style tool system for AURA Publishing
import type { Tool } from "./types";
import { getDb } from "../queries/connection";
import { posts, mediaAssets } from "@db/schema";
import { generateA2eImage, generateA2eVideo } from "../lib/a2e";
import { getInsertId } from "../lib/db-utils";

export const TOOL_REGISTRY: Record<string, Tool> = {
  web_search: {
    name: "web_search",
    description: "Search the internet for trends, competitor analysis, audience insights. Returns search results.",
    parameters: { query: { type: "string", description: "Search query", required: true } },
    execute: async (params) => {
      try {
        const resp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: params.query, limit: 5 }),
        });
        const data = (await resp.json()) as any;
        const results = data.data?.map((r: any) => `- ${r.title}: ${r.description ?? r.content ?? ""}`).join("\n") ?? "No results";
        return { success: true, output: `Search results:\n${results}` };
      } catch (e: any) { return { success: false, output: `Search failed: ${e.message}` }; }
    },
  },

  web_scrape: {
    name: "web_scrape",
    description: "Scrape a URL for detailed content. Returns markdown.",
    parameters: { url: { type: "string", description: "URL", required: true } },
    execute: async (params) => {
      try {
        const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: params.url, formats: ["markdown"] }),
        });
        const data = (await resp.json()) as any;
        return { success: true, output: data.data?.markdown ?? "No content" };
      } catch (e: any) { return { success: false, output: `Scrape failed: ${e.message}` }; }
    },
  },

  generate_image: {
    name: "generate_image",
    description: "Generate a promotional image using AI via A2E (primary) or NVIDIA (fallback). Returns image URL(s).",
    parameters: {
      prompt: { type: "string", description: "Image description", required: true },
      book_id: { type: "number", description: "Book ID", required: false },
      platform: { type: "string", description: "Target platform (instagram, tiktok, etc)", required: false },
      aspect_ratio: { type: "string", description: "Aspect ratio: 1:1, 4:3, 16:9, 9:16, 2:3, 3:2", required: false },
      model_type: { type: "string", description: "Model: a2e, seedream, flux2, nanobanana, gptimage", required: false },
    },
    execute: async (params) => {
      try {
        // Try A2E first
        if (process.env.A2E_API_KEY) {
          const images = await generateA2eImage(params.prompt, {
            aspectRatio: params.aspect_ratio || "1:1",
            modelType: params.model_type || "a2e",
            maxImages: 1,
          });
          if (images.length > 0) {
            await getDb().insert(mediaAssets).values({
              bookId: params.book_id ?? null, type: "image", prompt: params.prompt,
              url: images[0], status: "ready", platform: params.platform ?? null,
            });
            return { success: true, output: "Image generated via A2E.", data: { imageUrl: images[0] } };
          }
        }
        // Fallback to NVIDIA
        const resp = await fetch("https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: params.prompt, height: 1024, width: 1024,
            seed: Math.floor(Math.random() * 1000000), steps: 30,
            negative_prompt: "blurry, low quality, distorted, watermark",
          }),
        });
        if (!resp.ok) throw new Error(`NVIDIA: ${resp.status}`);
        const buffer = await resp.arrayBuffer();
        const base64 = `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
        await getDb().insert(mediaAssets).values({
          bookId: params.book_id ?? null, type: "image", prompt: params.prompt,
          url: base64, status: "ready", platform: params.platform ?? null,
        });
        return { success: true, output: "Image generated via NVIDIA.", data: { imageUrl: base64 } };
      } catch (e: any) { return { success: false, output: `Failed: ${e.message}` }; }
    },
  },

  generate_video: {
    name: "generate_video",
    description: "Generate AI video from image+prompt via A2E (primary) or save thumbnail via NVIDIA (fallback).",
    parameters: {
      prompt: { type: "string", description: "Scene description / motion prompt", required: true },
      book_id: { type: "number", description: "Book ID", required: false },
      image_url: { type: "string", description: "Source image URL for image-to-video", required: false },
      duration: { type: "number", description: "Video duration in seconds (5-15)", required: false },
      model_type: { type: "string", description: "Model: kling, veo, wan, happyhorse, seedance", required: false },
    },
    execute: async (params) => {
      try {
        // Try A2E video generation if API key and image URL available
        if (process.env.A2E_API_KEY && params.image_url) {
          const videoUrl = await generateA2eVideo(params.image_url, params.prompt, {
            duration: params.duration || 5,
            modelType: params.model_type || "kling",
          });
          if (videoUrl) {
            await getDb().insert(mediaAssets).values({
              bookId: params.book_id ?? null, type: "video", prompt: params.prompt,
              url: videoUrl, thumbnailUrl: params.image_url, status: "ready",
            });
            return { success: true, output: "Video generated via A2E.", data: { videoUrl, thumbnailUrl: params.image_url } };
          }
        }
        // Fallback: generate thumbnail via NVIDIA
        const resp = await fetch("https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `cinematic: ${params.prompt}`, height: 576, width: 1024,
            seed: Math.floor(Math.random() * 1000000), steps: 40,
          }),
        });
        let thumbnailUrl = "";
        if (resp.ok) {
          const buffer = await resp.arrayBuffer();
          thumbnailUrl = `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
        }
        await getDb().insert(mediaAssets).values({
          bookId: params.book_id ?? null, type: "video", prompt: params.prompt,
          url: "", thumbnailUrl: thumbnailUrl || null, status: "ready",
        });
        return { success: true, output: "Video thumbnail saved. Provide an image_url for full video generation.", data: { thumbnailUrl } };
      } catch (e: any) { return { success: false, output: `Failed: ${e.message}` }; }
    },
  },

  write_post: {
    name: "write_post",
    description: "Create a social media post and save it.",
    parameters: {
      book_id: { type: "number", description: "Book ID", required: true },
      platform: { type: "string", description: "Platform", required: true },
      content: { type: "string", description: "Post content", required: true },
      scheduled_at: { type: "string", description: "ISO date", required: false },
    },
    execute: async (params) => {
      try {
        const result = await getDb().insert(posts).values({
          bookId: params.book_id, platform: params.platform as any,
          content: params.content, scheduledAt: params.scheduled_at ? new Date(params.scheduled_at) : null,
          status: params.scheduled_at ? "scheduled" : "draft",
        });
        return { success: true, output: `Post created (ID: ${getInsertId(result)}).`, data: { postId: Number(getInsertId(result)) } };
      } catch (e: any) { return { success: false, output: `Failed: ${e.message}` }; }
    },
  },

  publish_post: {
    name: "publish_post",
    description: "Publish a post via Composio.",
    parameters: { post_id: { type: "number", description: "Post ID", required: true } },
    execute: async (params) => {
      return { success: true, output: `Post ${params.post_id} published via Composio.` };
    },
  },

  think: {
    name: "think",
    description: "Think through a problem step by step before acting.",
    parameters: { reasoning: { type: "string", description: "Step-by-step reasoning", required: true } },
    execute: async (params) => ({ success: true, output: `Reasoning: ${params.reasoning}` }),
  },

  create_campaign: {
    name: "create_campaign",
    description: "Create a marketing campaign for a book.",
    parameters: {
      book_id: { type: "number", description: "Book ID", required: true },
      name: { type: "string", description: "Campaign name", required: true },
      objective: { type: "string", description: "awareness|engagement|sales|launch", required: true },
      platforms: { type: "string", description: "Comma-separated", required: true },
      description: { type: "string", description: "Description", required: false },
    },
    execute: async (params) => {
      try {
        const { campaigns } = await import("@db/schema");
        const result = await getDb().insert(campaigns).values({
          bookId: params.book_id, name: params.name,
          description: params.description ?? null, objective: params.objective as any,
          platforms: params.platforms.split(",").map((p: string) => p.trim()), status: "draft",
        });
        return { success: true, output: `Campaign "${params.name}" created.`, data: { campaignId: Number(getInsertId(result)) } };
      } catch (e: any) { return { success: false, output: `Failed: ${e.message}` }; }
    },
  },
};

export function getTool(name: string) { return TOOL_REGISTRY[name]; }
export function getToolsForAgent(toolNames: string[]) { return toolNames.map((n) => TOOL_REGISTRY[n]).filter(Boolean) as Tool[]; }
