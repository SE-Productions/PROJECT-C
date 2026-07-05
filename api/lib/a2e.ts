// A2E Media Generation Client — Image & Video via a2e.ai
// Base URL: https://video.a2e.ai
// Token: sk_eyJ... (stored in env)

const A2E_API_KEY = process.env.A2E_API_KEY;
const A2E_BASE_URL = "https://video.a2e.ai";

interface A2eImageResponse {
  data?: {
    _id?: string;
    status?: string;
    outputImages?: string[];
  };
  message?: string;
}

interface A2eVideoResponse {
  data?: {
    _id?: string;
    status?: string;
    videoOutput?: string;
  };
  message?: string;
}

async function a2eRequest(path: string, body: any): Promise<any> {
  if (!A2E_API_KEY) throw new Error("A2E_API_KEY not configured");

  const resp = await fetch(`${A2E_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${A2E_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`A2E ${resp.status}: ${text.substring(0, 200)}`);
  }

  return resp.json();
}

async function a2eGet(path: string): Promise<any> {
  if (!A2E_API_KEY) throw new Error("A2E_API_KEY not configured");

  const resp = await fetch(`${A2E_BASE_URL}${path}`, {
    headers: {
      "Authorization": `Bearer ${A2E_API_KEY}`,
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`A2E ${resp.status}: ${text.substring(0, 200)}`);
  }

  return resp.json();
}

/**
 * Generate images from text prompt using A2E
 * Models: a2e (default), seedream, flux2, nanobanana, gptimage
 */
export async function generateA2eImage(
  prompt: string,
  opts: {
    aspectRatio?: string;
    height?: number;
    modelType?: string;
    maxImages?: number;
  } = {}
): Promise<string[]> {
  const result: A2eImageResponse = await a2eRequest("/api/v1/userText2Image/start", {
    prompt,
    aspect_ratio: opts.aspectRatio || "1:1",
    height: opts.height || 1024,
    model_type: opts.modelType || "a2e",
    max_images: opts.maxImages || 1,
  });

  const taskId = result.data?._id;
  if (!taskId) throw new Error("No task ID returned from A2E");

  // Poll for completion (up to 60 seconds)
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const status: A2eImageResponse = await a2eGet(`/api/v1/userText2Image/${taskId}`);
    if (status.data?.status === "completed" || status.data?.status === "done") {
      return status.data?.outputImages || [];
    }
    if (status.data?.status === "failed" || status.data?.status === "error") {
      throw new Error(`A2E image generation failed: ${status.message || "Unknown error"}`);
    }
  }

  throw new Error("A2E image generation timed out");
}

/**
 * Generate video from image using A2E
 * Models: kling, veo, wan, happyhorse, grok, seedance
 */
export async function generateA2eVideo(
  imageUrl: string,
  prompt: string,
  opts: {
    duration?: number;
    aspectRatio?: string;
    modelType?: string;
  } = {}
): Promise<string> {
  const result: A2eVideoResponse = await a2eRequest("/api/v1/userImage2Video/start", {
    image: imageUrl,
    prompt,
    duration: opts.duration || 5,
    aspect_ratio: opts.aspectRatio || "16:9",
    model_type: opts.modelType || "kling",
  });

  const taskId = result.data?._id;
  if (!taskId) throw new Error("No task ID returned from A2E");

  // Poll for completion (up to 5 minutes)
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const status: A2eVideoResponse = await a2eGet(`/api/v1/userImage2Video/${taskId}`);
    if (status.data?.status === "completed" || status.data?.status === "done") {
      return status.data?.videoOutput || "";
    }
    if (status.data?.status === "failed" || status.data?.status === "error") {
      throw new Error(`A2E video generation failed: ${status.message || "Unknown error"}`);
    }
  }

  throw new Error("A2E video generation timed out");
}

/**
 * Generate avatar video (talking head) from text
 */
export async function generateA2eAvatar(
  text: string,
  avatarId: string,
  opts: {
    language?: string;
    voiceId?: string;
  } = {}
): Promise<string> {
  const result = await a2eRequest("/api/v1/generateAvatarVideos/start", {
    text,
    avatar_id: avatarId,
    language: opts.language || "en",
    voice_id: opts.voiceId,
  });

  const taskId = result.data?._id;
  if (!taskId) throw new Error("No task ID returned from A2E");

  // Poll for completion
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const status = await a2eGet(`/api/v1/generateAvatarVideos/${taskId}`);
    if (status.data?.status === "completed" || status.data?.status === "done") {
      return status.data?.videoOutput || "";
    }
    if (status.data?.status === "failed" || status.data?.status === "error") {
      throw new Error(`A2E avatar generation failed`);
    }
  }

  throw new Error("A2E avatar generation timed out");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Quick health check — test if A2E API key is valid
 */
export async function isA2eHealthy(): Promise<boolean> {
  if (!A2E_API_KEY) return false;
  try {
    // Try to get records (lightweight call)
    const resp = await fetch(`${A2E_BASE_URL}/api/v1/userText2Image/allRecords?limit=1`, {
      headers: { "Authorization": `Bearer ${A2E_API_KEY}` },
    });
    return resp.ok;
  } catch {
    return false;
  }
}
