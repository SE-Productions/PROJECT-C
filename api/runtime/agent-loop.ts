import type { AgentContext, AgentLoopResult, ToolCallRecord } from "./types";
import { getPersona } from "./agents";
import { getToolsForAgent, TOOL_REGISTRY } from "./tools";
import { getDb } from "../queries/connection";
import { agentMessages } from "@db/schema";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface ModelResponse {
  text: string;
  toolCalls: Array<{ name: string; params: Record<string, any> }>;
}

function parseToolCalls(text: string): { cleanText: string; toolCalls: Array<{ name: string; params: Record<string, any> }> } {
  const toolCallRegex = /<tool\s+name="([^"]+)">\s*(\{[^]*?\})\s*<\/tool>/g;
  const toolCalls: Array<{ name: string; params: Record<string, any> }> = [];
  let match: RegExpExecArray | null;
  while ((match = toolCallRegex.exec(text)) !== null) {
    try { toolCalls.push({ name: match[1], params: JSON.parse(match[2]) }); } catch { /* skip */ }
  }
  return { cleanText: text.replace(toolCallRegex, "").trim(), toolCalls };
}

function buildPrompt(ctx: AgentContext): string {
  const persona = getPersona(ctx.agentType);
  if (!persona) throw new Error(`Unknown agent: ${ctx.agentType}`);
  const tools = getToolsForAgent(persona.tools);
  const toolDescriptions = tools.map((t) => {
    const params = Object.entries(t.parameters).map(([k, v]) => `    ${k}: ${v.type}${v.required ? " (required)" : ""} — ${v.description}`).join("\n");
    return `- ${t.name}: ${t.description}\n${params}`;
  }).join("\n\n");
  const memoryContext = ctx.memory.slice(-10).map((m) => `[${m.role}] ${m.content}`).join("\n");
  return `${persona.systemPrompt}\n\n## Available Tools\n<tool name="tool_name">{"param": "value"}</tool>\n\n${toolDescriptions}\n\n## Memory\n${memoryContext}\n\n## Request\n${ctx.userMessage}\n\nRespond naturally. Use tools when needed. Provide final summary when done.`;
}

async function callModel(prompt: string, temperature: number): Promise<ModelResponse> {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: 4096 },
      }),
    }
  );
  if (!resp.ok) throw new Error(`Gemini: ${resp.status}`);
  const data = (await resp.json()) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";
  const { cleanText, toolCalls } = parseToolCalls(text);
  return { text: cleanText, toolCalls };
}

async function executeTool(name: string, params: Record<string, any>, _ctx: AgentContext) {
  const tool = TOOL_REGISTRY[name];
  if (!tool) return { success: false as const, output: `Tool "${name}" not found.` };
  return tool.execute(params, _ctx);
}

async function persistMemory(agentType: string, bookId: number | undefined, role: "user" | "agent", message: string, metadata?: any) {
  await getDb().insert(agentMessages).values({
    agentType: agentType as any, bookId: bookId ?? null, role, message,
    metadata: metadata ?? {},
  });
}

export async function runAgentLoop(ctx: AgentContext): Promise<AgentLoopResult> {
  const persona = getPersona(ctx.agentType);
  if (!persona) throw new Error(`Unknown: ${ctx.agentType}`);
  const toolCalls: ToolCallRecord[] = [];
  let finalResponse = "";
  let completed = false;

  await persistMemory(ctx.agentType, ctx.bookId, "user", ctx.userMessage);

  for (let iteration = 0; iteration < persona.maxIterations; iteration++) {
    ctx.iteration = iteration;
    const prompt = buildPrompt(ctx);
    const modelResp = await callModel(prompt, persona.temperature);

    if (modelResp.toolCalls.length === 0) {
      finalResponse = modelResp.text;
      completed = true;
      break;
    }

    for (const tc of modelResp.toolCalls) {
      const result = await executeTool(tc.name, tc.params, ctx);
      toolCalls.push({ tool: tc.name, params: tc.params, result, timestamp: new Date() });
      ctx.memory.push({ timestamp: new Date(), role: "agent", content: `[${tc.name}] ${result.output}`, metadata: result.data });
    }

    if (modelResp.text) finalResponse = modelResp.text;
  }

  if (!completed && !finalResponse) {
    finalResponse = `Executed ${toolCalls.length} tool(s):\n` +
      toolCalls.map((tc, i) => `${i + 1}. **${tc.tool}**: ${tc.result.output}`).join("\n");
  }

  await persistMemory(ctx.agentType, ctx.bookId, "agent", finalResponse, { iterations: toolCalls.length, completed });

  return { finalResponse, toolCalls, iterations: toolCalls.length, completed };
}
