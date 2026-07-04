// Skill Loader — Persists all 30 skills to the scratch pad RAG library on boot
import { getDb } from "../queries/connection";
import { scratchPad } from "@db/schema";
import { eq } from "drizzle-orm";
import { SKILL_REGISTRY } from "./registry";

const SKILLS_LOADED_KEY = "skills_library_loaded_v1";

/**
 * Load all 30 skills into the scratch pad RAG library.
 * Idempotent — only loads skills that don't already exist.
 * Called during server boot.
 */
export async function loadSkillsToRagLibrary(): Promise<{ loaded: number; skipped: number }> {
  const db = getDb();
  let loaded = 0;
  let skipped = 0;

  for (const skill of SKILL_REGISTRY) {
    // Check if skill already exists
    const existing = await db.select()
      .from(scratchPad)
      .where(eq(scratchPad.key, skill.id))
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    // Store skill as structured JSON in the scratch pad
    await db.insert(scratchPad).values({
      key: skill.id,
      value: JSON.stringify({
        name: skill.name,
        description: skill.description,
        category: skill.category,
        triggerKeywords: skill.triggerKeywords,
        executionSteps: skill.executionSteps,
        tools: skill.tools,
        agentType: skill.agentType,
        complexity: skill.complexity,
        contextRequired: skill.contextRequired,
        outputFormat: skill.outputFormat,
        examples: skill.examples,
        siePhase: skill.siePhase,
      }),
      category: "skill_library",
      tags: ["skill", skill.category, skill.agentType, skill.complexity, ...skill.triggerKeywords.slice(0, 3)],
      source: "skill_registry",
      accessCount: 0,
    });
    loaded++;
  }

  // Mark that skills have been loaded
  const marker = await db.select().from(scratchPad).where(eq(scratchPad.key, SKILLS_LOADED_KEY)).limit(1);
  if (marker.length === 0) {
    await db.insert(scratchPad).values({
      key: SKILLS_LOADED_KEY,
      value: JSON.stringify({ loadedAt: new Date().toISOString(), count: SKILL_REGISTRY.length }),
      category: "system_marker",
      tags: ["system", "skills", "bootstrap"],
      source: "skill_loader",
      accessCount: 0,
    });
  }

  console.log(`[SkillLoader] ${loaded} skills loaded, ${skipped} skipped. Total: ${SKILL_REGISTRY.length}`);
  return { loaded, skipped };
}

/**
 * Check if skills are loaded in the RAG library.
 */
export async function areSkillsLoaded(): Promise<boolean> {
  const db = getDb();
  const result = await db.select().from(scratchPad)
    .where(eq(scratchPad.key, SKILLS_LOADED_KEY))
    .limit(1);
  return result.length > 0;
}

/**
 * Force reload all skills (updates existing entries).
 */
export async function reloadSkills(): Promise<{ updated: number }> {
  const db = getDb();
  let updated = 0;

  for (const skill of SKILL_REGISTRY) {
    // Delete existing
    await db.delete(scratchPad).where(eq(scratchPad.key, skill.id));

    // Insert fresh
    await db.insert(scratchPad).values({
      key: skill.id,
      value: JSON.stringify({
        name: skill.name,
        description: skill.description,
        category: skill.category,
        triggerKeywords: skill.triggerKeywords,
        executionSteps: skill.executionSteps,
        tools: skill.tools,
        agentType: skill.agentType,
        complexity: skill.complexity,
        contextRequired: skill.contextRequired,
        outputFormat: skill.outputFormat,
        examples: skill.examples,
        siePhase: skill.siePhase,
      }),
      category: "skill_library",
      tags: ["skill", skill.category, skill.agentType, skill.complexity, ...skill.triggerKeywords.slice(0, 3)],
      source: "skill_registry",
      accessCount: 0,
    });
    updated++;
  }

  console.log(`[SkillLoader] ${updated} skills reloaded`);
  return { updated };
}
