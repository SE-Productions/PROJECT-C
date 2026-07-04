// Memory System — RAG-style scratch pad with keyword search
import { getDb } from "../queries/connection";
import { scratchPad, agentScratchPad } from "@db/schema";
import { eq, desc, like, or } from "drizzle-orm";

/**
 * Write a memory entry to the global scratch pad.
 * Agents call this to persist findings, research, decisions.
 */
export async function writeMemory(
  key: string,
  value: string,
  category = "general",
  opts?: { tags?: string[]; source?: string; bookId?: number }
): Promise<number> {
  const db = getDb();
  const result = await db.insert(scratchPad).values({
    key,
    value,
    category,
    tags: opts?.tags ?? [],
    source: opts?.source ?? null,
    bookId: opts?.bookId ?? null,
    accessCount: 0,
  });
  return Number(result[0].insertId);
}

/**
 * Search the scratch pad by keywords.
 * Returns entries where key, value, or tags match the query.
 */
export async function searchMemory(query: string, limit = 5): Promise<Array<{
  id: number; key: string; value: string; category: string; tags: string[]; accessCount: number; updatedAt: Date;
}>> {
  const db = getDb();
  const q = `%${query}%`;
  const results = await db.select()
    .from(scratchPad)
    .where(or(
      like(scratchPad.key, q),
      like(scratchPad.value, q)
    ))
    .orderBy(desc(scratchPad.accessCount), desc(scratchPad.updatedAt))
    .limit(limit);

  // Increment access count
  for (const r of results) {
    await db.update(scratchPad)
      .set({ accessCount: (r.accessCount ?? 0) + 1 })
      .where(eq(scratchPad.id, r.id));
  }

  return results.map((r) => ({
    id: r.id,
    key: r.key,
    value: r.value,
    category: r.category ?? "general",
    tags: (r.tags as string[]) ?? [],
    accessCount: Number(r.accessCount ?? 0),
    updatedAt: r.updatedAt,
  }));
}

/**
 * Get memory entries by category.
 */
export async function getMemoryByCategory(category: string, limit = 20) {
  const db = getDb();
  return db.select().from(scratchPad)
    .where(eq(scratchPad.category, category))
    .orderBy(desc(scratchPad.updatedAt))
    .limit(limit);
}

/**
 * Recall all memory for a specific book.
 */
export async function getMemoryByBook(bookId: number, limit = 20) {
  const db = getDb();
  return db.select().from(scratchPad)
    .where(eq(scratchPad.bookId, bookId))
    .orderBy(desc(scratchPad.updatedAt))
    .limit(limit);
}

/**
 * Delete a memory entry.
 */
export async function deleteMemory(id: number) {
  const db = getDb();
  await db.delete(scratchPad).where(eq(scratchPad.id, id));
}

// ─── AGENT SCRATCH PAD — Temporary working memory ───

/**
 * Write a thought/decision to the agent scratch pad.
 * Called during agent execution to track reasoning.
 */
export async function writeAgentThought(
  agentType: string,
  taskId: number,
  thought: string,
  decision?: string,
  reasoning?: string,
  bookId?: number
): Promise<number> {
  const db = getDb();
  const result = await db.insert(agentScratchPad).values({
    agentType: agentType as any,
    taskId,
    bookId: bookId ?? null,
    thought,
    decision: decision ?? null,
    reasoning: reasoning ?? null,
    status: "active",
  });
  return Number(result[0].insertId);
}

/**
 * Get all active thoughts for an agent's current task.
 */
export async function getAgentThoughts(taskId: number) {
  const db = getDb();
  return db.select().from(agentScratchPad)
    .where(eq(agentScratchPad.taskId, taskId))
    .orderBy(agentScratchPad.createdAt);
}

/**
 * Mark thoughts as resolved when task completes.
 */
export async function resolveAgentThoughts(taskId: number) {
  const db = getDb();
  await db.update(agentScratchPad)
    .set({ status: "resolved" })
    .where(eq(agentScratchPad.taskId, taskId));
}

/**
 * Get the full context string for an agent's scratch pad.
 * Used to inject working memory into the agent prompt.
 */
export async function getAgentContext(taskId: number): Promise<string> {
  const thoughts = await getAgentThoughts(taskId);
  if (thoughts.length === 0) return "";

  return thoughts
    .filter((t) => t.status === "active")
    .map((t, i) => `[Step ${i + 1}] ${t.thought}${t.decision ? ` → Decision: ${t.decision}` : ""}${t.reasoning ? ` (Reasoning: ${t.reasoning})` : ""}`)
    .join("\n");
}
