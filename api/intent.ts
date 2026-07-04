// Intent Parser — Natural Language → Structured Command
// Uses Gemini to parse user text into actionable commands
import { routeGeneral } from "./lib/model-router";

export interface ParsedIntent {
  action: string;
  agentType: "planner" | "search" | "media" | "social";
  description: string;
  params: Record<string, any>;
  confidence: number;
  needsConfirmation: boolean;
}

/**
 * Parse natural language into structured intent
 * E = R[(G + C + K + T + M) → O → P → A → V → Δ → F]
 */
export async function parseIntent(userText: string, context?: { books?: any[] }): Promise<ParsedIntent> {
  const prompt = `You are an Intent Parser for AURA Publishing. Parse the user's request into a structured command.

Available actions:
- create_campaign: Create a marketing campaign (needs: book_id, name, objective, platforms)
- write_post: Create a social media post (needs: book_id, platform, content, optional scheduled_at)
- generate_image: Generate promotional image (needs: prompt, optional book_id, platform)
- generate_video: Generate promotional video (needs: prompt, optional book_id)
- research: Research trends/competitors (needs: query)
- publish_post: Publish a post immediately (needs: post_id)
- schedule_post: Schedule a post (needs: post_id, scheduled_at)
- run_crew: Run multi-agent crew (needs: goal)
- create_cron: Schedule recurring agent task (needs: name, agent_type, prompt, schedule)

Available agents: planner, search, media, social

Books in library:
${context?.books?.map((b) => `- ID ${b.id}: "${b.title}" by ${b.author}`).join("\n") ?? "No books yet."}

User request: "${userText}"

Respond ONLY with valid JSON:
{
  "action": "action_name",
  "agentType": "planner|search|media|social",
  "description": "human-readable summary of what will be done",
  "params": { "key": "value" },
  "confidence": 0.0-1.0,
  "needsConfirmation": true|false
}`;

  const routed = await routeGeneral(prompt, { temperature: 0.1, maxTokens: 1024 });
  if (!routed) return fallbackIntent(userText);
  const text = routed.text;

  // Extract JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return fallbackIntent(userText);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      action: String(parsed.action ?? "chat"),
      agentType: ["planner", "search", "media", "social"].includes(parsed.agentType)
        ? parsed.agentType
        : "planner",
      description: String(parsed.description ?? userText),
      params: typeof parsed.params === "object" ? parsed.params : {},
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      needsConfirmation: parsed.needsConfirmation !== false,
    };
  } catch {
    return fallbackIntent(userText);
  }
}

function fallbackIntent(userText: string): ParsedIntent {
  // Smart fallback: detect keywords
  const lower = userText.toLowerCase();

  if (lower.includes("post") || lower.includes("tweet") || lower.includes("share")) {
    return { action: "write_post", agentType: "social", description: `Create social post: "${userText}"`, params: { content: userText }, confidence: 0.6, needsConfirmation: true };
  }
  if (lower.includes("image") || lower.includes("picture") || lower.includes("graphic")) {
    return { action: "generate_image", agentType: "media", description: `Generate image: "${userText}"`, params: { prompt: userText }, confidence: 0.6, needsConfirmation: true };
  }
  if (lower.includes("video")) {
    return { action: "generate_video", agentType: "media", description: `Generate video: "${userText}"`, params: { prompt: userText }, confidence: 0.6, needsConfirmation: true };
  }
  if (lower.includes("research") || lower.includes("search") || lower.includes("find")) {
    return { action: "research", agentType: "search", description: `Research: "${userText}"`, params: { query: userText }, confidence: 0.6, needsConfirmation: true };
  }
  if (lower.includes("campaign") || lower.includes("launch")) {
    return { action: "create_campaign", agentType: "planner", description: `Create campaign: "${userText}"`, params: { name: userText.slice(0, 50) }, confidence: 0.6, needsConfirmation: true };
  }
  if (lower.includes("schedule") || lower.includes("cron") || lower.includes("every") || lower.includes("daily") || lower.includes("weekly")) {
    return { action: "create_cron", agentType: "social", description: `Schedule recurring task: "${userText}"`, params: { name: userText.slice(0, 50), prompt: userText }, confidence: 0.6, needsConfirmation: true };
  }

  // Default: chat with planner agent
  return { action: "chat", agentType: "planner", description: `Chat: "${userText}"`, params: { message: userText }, confidence: 0.4, needsConfirmation: false };
}
