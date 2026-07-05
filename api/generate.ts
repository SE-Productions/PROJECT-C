import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { mediaAssets } from "@db/schema";
import { eq } from "drizzle-orm";
import { getInsertId } from "./lib/db-utils";

// Image generation via NVIDIA Stable Diffusion XL
async function generateImage(prompt: string): Promise<string> {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaKey) {
    throw new Error("NVIDIA_API_KEY not configured");
  }

  const response = await fetch(
    "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${nvidiaKey}`,
        "Content-Type": "application/json",
        "NVCF-INPUT-ASSET-REFERENCES": "",
        "NVCF-FUNCTION-ID": "",
      },
      body: JSON.stringify({
        prompt,
        height: 1024,
        width: 1024,
        seed: Math.floor(Math.random() * 1000000),
        steps: 30,
        negative_prompt: "blurry, low quality, distorted, watermark, text, ugly",
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`NVIDIA API error: ${response.status} - ${err}`);
  }

  // Response is binary image data
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:image/png;base64,${base64}`;
}

// Video generation - creates a prompt-driven video asset
// For MVP: returns a structured video generation request that can be processed
async function generateVideo(prompt: string): Promise<{ url: string; thumbnailUrl: string }> {
  // Video generation requires external API. For the MVP, we create a structured
  // generation request and return a generated video using the available tools.
  // In production, this would call Runway, Pika, or similar.

  // Placeholder: generate a dynamic thumbnail and store the video request
  // The actual video URL will be a placeholder that the user can replace
  // with their own generated video file

  const thumbnailResponse = await fetch(
    "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY ?? ""}`,
        "Content-Type": "application/json",
        "NVCF-INPUT-ASSET-REFERENCES": "",
        "NVCF-FUNCTION-ID": "",
      },
      body: JSON.stringify({
        prompt: `cinematic video frame: ${prompt}, high quality, film grain, anamorphic lens, dramatic lighting`,
        height: 576,
        width: 1024,
        seed: Math.floor(Math.random() * 1000000),
        steps: 40,
        negative_prompt: "blurry, low quality, distorted",
      }),
    }
  );

  let thumbnailUrl = "";
  if (thumbnailResponse.ok) {
    const buffer = await thumbnailResponse.arrayBuffer();
    thumbnailUrl = `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
  }

  // Return with placeholder video - in production this would be a real video file
  return {
    url: `/api/video-placeholder?prompt=${encodeURIComponent(prompt)}`,
    thumbnailUrl,
  };
}

export const generateRouter = createRouter({
  image: publicQuery
    .input(z.object({
      prompt: z.string().min(1),
      bookId: z.number().optional(),
      platform: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Save initial record with placeholder URL (non-empty to satisfy NOT NULL)
      const result = await db.insert(mediaAssets).values({
        bookId: input.bookId ?? null,
        type: "image",
        prompt: input.prompt,
        url: "pending",
        status: "generating",
        platform: input.platform ?? null,
      });
      const assetId = Number(getInsertId(result));

      try {
        const imageUrl = await generateImage(input.prompt);

        await db.update(mediaAssets).set({
          url: imageUrl,
          status: "ready",
        }).where(eq(mediaAssets.id, assetId));

        return { id: assetId, url: imageUrl, status: "ready" };
      } catch (error: any) {
        await db.update(mediaAssets).set({
          status: "failed",
        }).where(eq(mediaAssets.id, assetId));

        throw new Error(error.message ?? "Image generation failed");
      }
    }),

  video: publicQuery
    .input(z.object({
      prompt: z.string().min(1),
      bookId: z.number().optional(),
      platform: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Save initial record with placeholder URLs (non-empty to satisfy NOT NULL)
      const result = await db.insert(mediaAssets).values({
        bookId: input.bookId ?? null,
        type: "video",
        prompt: input.prompt,
        url: "pending",
        thumbnailUrl: "pending",
        status: "generating",
        platform: input.platform ?? null,
      });
      const assetId = Number(getInsertId(result));

      try {
        const { url, thumbnailUrl } = await generateVideo(input.prompt);

        await db.update(mediaAssets).set({
          url,
          thumbnailUrl: thumbnailUrl || null,
          status: "ready",
        }).where(eq(mediaAssets.id, assetId));

        return { id: assetId, url, thumbnailUrl, status: "ready" };
      } catch (error: any) {
        await db.update(mediaAssets).set({
          status: "failed",
        }).where(eq(mediaAssets.id, assetId));

        throw new Error(error.message ?? "Video generation failed");
      }
    }),
});
