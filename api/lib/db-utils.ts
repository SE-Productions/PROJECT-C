// Safe database utility helpers
/**
 * Safely extract insertId from Drizzle insert result.
 * Handles cases where result[0] is undefined or insertId is missing.
 */
export function getInsertId(result: any): number {
  if (!result) return 0;
  if (Array.isArray(result)) {
    if (result.length === 0) return 0;
    // Drizzle returns [{ insertId: bigint }]
    const id = result[0]?.insertId ?? result[0]?.insert_id ?? result.insertId ?? result.insert_id ?? 0;
    return Number(id) || 0;
  }
  // Sometimes result is the id directly
  const id = result.insertId ?? result.insert_id ?? 0;
  return Number(id) || 0;
}

/**
 * Safely extract affectedRows from Drizzle result.
 */
export function getAffectedRows(result: any): number {
  if (!result) return 0;
  if (Array.isArray(result)) {
    if (result.length === 0) return 0;
    return Number(result[0]?.affectedRows ?? result[0]?.affected_rows ?? 0) || 0;
  }
  return Number(result.affectedRows ?? result.affected_rows ?? 0) || 0;
}
