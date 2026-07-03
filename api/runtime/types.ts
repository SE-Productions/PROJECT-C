// OpenClaw-inspired agent runtime types for AURA Publishing

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  execute: (params: Record<string, any>, context: AgentContext) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  data?: any;
}

export interface AgentContext {
  agentType: string;
  bookId?: number;
  campaignId?: number;
  userMessage: string;
  memory: MemoryEntry[];
  iteration: number;
}

export interface MemoryEntry {
  timestamp: Date;
  role: "system" | "user" | "agent" | "tool";
  content: string;
  toolName?: string;
  metadata?: any;
}

export interface AgentPersona {
  name: string;
  type: "planner" | "search" | "media" | "social";
  description: string;
  systemPrompt: string;
  tools: string[];
  maxIterations: number;
  temperature: number;
}

export interface AgentLoopResult {
  finalResponse: string;
  toolCalls: ToolCallRecord[];
  iterations: number;
  completed: boolean;
}

export interface ToolCallRecord {
  tool: string;
  params: Record<string, any>;
  result: ToolResult;
  timestamp: Date;
}

export interface HeartbeatTask {
  id: number;
  agentType: string;
  bookId?: number;
  prompt: string;
  interval: number; // minutes
  lastRun?: Date;
  nextRun: Date;
  active: boolean;
}
