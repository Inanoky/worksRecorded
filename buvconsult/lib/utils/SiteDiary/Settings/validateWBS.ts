// C:\Users\user\MVP\Buvconsult-deploy\buvconsult\app\utils\SiteDiary\Settings\validateWBS.ts

/**
 * Validate WBS codes cascade.
 *
 * Rules:
 * - Must be numbers separated by dots (e.g., 1, 2.1, 2.1.1).
 * - Each child must have its parent already defined above.
 * - Top-level branches must appear in ascending order (cannot go back).
 * - Gaps are allowed (e.g., 2 then 4).
 */
export function validateWBS(rows: any[][]) {
  const wbsPattern = /^\d+(\.\d+)*$/;
  const seenCodes = new Set<string>();
  let lastTopLevel = 0;

  // Skip header row (row[0])
  for (const row of rows.slice(1)) {
    const wbs = row[2];
    if (!wbs) continue; // already checked for missing earlier

    const wbsStr = String(wbs).trim();

    // Must match format: numbers separated by dots
    if (!wbsPattern.test(wbsStr)) {
      throw new Error(`Excel validation failed: Invalid WBS format "${wbsStr}"`);
    }

    const parts = wbsStr.split(".");

    if (parts.length === 1) {
      // Top-level WBS (like "2", "4", etc.)
      const topLevelNum = parseInt(parts[0], 10);
      if (topLevelNum < lastTopLevel) {
        throw new Error(
          `Excel validation failed: Branch "${wbsStr}" is out of order (appears after ${lastTopLevel})`
        );
      }
      lastTopLevel = topLevelNum;
    } else {
      // Child WBS → must have parent above
      const parent = parts.slice(0, -1).join(".");
      if (!seenCodes.has(parent)) {
        throw new Error(
          `Excel validation failed: WBS "${wbsStr}" missing parent "${parent}"`
        );
      }
    }

    // Record this code as seen
    seenCodes.add(wbsStr);
  }
}
