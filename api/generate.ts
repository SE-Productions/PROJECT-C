import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { mediaAssets } from "@db/schema";
import { eq } from "drizzle-orm";
import { getInsertId } from "./lib/db-utils";
import { generateA2eImage, generateA2eVideo, isA2eHealthy } from "./lib/a2e";

// ─── A2E PRIMARY → NVIDIA FALLBACK ───

/** Generate image via A2E (primary) with NVIDIA fallback */
async function generateImageWithFallback(
  prompt: string,
  modelType?: string
): Promise<string> {
  // Try A2E first
  if (process.env.A2E_API_KEY) {
    try {
      const healthy = await isA2eHealthy();
      if (healthy) {
        const urls = await generateA2eImage(prompt, {
          modelType: modelType || "a2e",
          aspectRatio: "1:1",
          height: 1024,
          maxImages: 1,
        });
        if (urls.length > 0) return urls[0];
      }
    } catch (e: any) {
      console.log(`[Generate] A2E image failed (${e.message}), falling back to NVIDIA`);
    }
  }

  // Fallback: NVIDIA Stable Diffusion XL
  return generateImageNvidia(prompt);
}

/** Generate video via A2E (primary) with NVIDIA fallback */
async function generateVideoWithFallback(
  prompt: string,
  modelType?: string
): Promise<{ url: string; thumbnailUrl: string }> {
  // Try A2E first: generate image → then video from image
  if (process.env.A2E_API_KEY) {
    try {
      const healthy = await isA2eHealthy();
      if (healthy) {
        // Step 1: Generate an image first
        const imageUrls = await generateA2eImage(prompt, {
          modelType: "a2e",
          aspectRatio: "16:9",
          height: 576,
          maxImages: 1,
        });
        if (imageUrls.length === 0) throw new Error("A2E image pre-generation failed");

        // Step 2: Generate video from the image
        const videoUrl = await generateA2eVideo(imageUrls[0], prompt, {
          modelType: modelType || "kling",
          duration: 5,
          aspectRatio: "16:9",
        });

        return { url: videoUrl, thumbnailUrl: imageUrls[0] };
      }
    } catch (e: any) {
      console.log(`[Generate] A2E video failed (${e.message}), falling back to NVIDIA`);
    }
  }

  // Fallback: NVIDIA thumbnail + placeholder video
  return generateVideoNvidia(prompt);
}

// ─── NVIDIA FALLBACK IMPLEMENTATIONS ───

async function generateImageNvidia(prompt: string): Promise<string> {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaKey) throw new Error("NVIDIA_API_KEY not configured");

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

  const buffer = await response.arrayBuffer();
  return `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
}

async function generateVideoNvidia(
  prompt: string
): Promise<{ url: string; thumbnailUrl: string }> {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaKey) throw new Error("NVIDIA_API_KEY not configured");

  // Generate a cinematic thumbnail frame
  const thumbResponse = await fetch(
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
  if (thumbResponse.ok) {
    const buffer = await thumbResponse.arrayBuffer();
    thumbnailUrl = `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
  }

  return {
    url: `/api/video-placeholder?prompt=${encodeURIComponent(prompt)}`,
    thumbnailUrl,
  };
}

// ─── tRPC ROUTER ───

export const generateRouter = createRouter({
  image: publicQuery
    .input(
      z.object({
        prompt: z.string().min(1),
        bookId: z.number().optional(),
        platform: z.string().optional(),
        model: z.string().optional(), // a2e, seedream, flux2, nanobanana, gptimage
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

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
        const imageUrl = await generateImageWithFallback(input.prompt, input.model);

        await db
          .update(mediaAssets)
          .set({ url: imageUrl, status: "ready" })
          .where(eq(mediaAssets.id, assetId));

        return { id: assetId, url: imageUrl, status: "ready" };
      } catch (error: any) {
        await db
          .update(mediaAssets)
          .set({ status: "failed" })
          .where(eq(mediaAssets.id, assetId));
        throw new Error(error.message ?? "Image generation failed");
      }
    }),

  video: publicQuery
    .input(
      z.object({
        prompt: z.string().min(1),
        bookId: z.number().optional(),
        platform: z.string().optional(),
        model: z.string().optional(), // kling, veo, wan, seedance
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

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
        const { url, thumbnailUrl } = await generateVideoWithFallback(
          input.prompt,
          input.model
        );

        await db
          .update(mediaAssets)
          .set({ url, thumbnailUrl: thumbnailUrl || null, status: "ready" })
          .where(eq(mediaAssets.id, assetId));

        return { id: assetId, url, thumbnailUrl, status: "ready" };
      } catch (error: any) {
        await db
          .update(mediaAssets)
          .set({ status: "failed" })
          .where(eq(mediaAssets.id, assetId));
        throw new Error(error.message ?? "Video generation failed");
      }
    }),
});
