type SiteDiarySaveToolResult = {
  ok?: boolean;
  message?: string;
  count?: number;
  recordIds?: string[] | null;
} | null | undefined;

export function formatSiteDiarySaveToolResult(
  result: SiteDiarySaveToolResult,
  fallbackCount: number,
) {
  if (!result?.ok) {
    return `Failed to save site diary entry. Reason: ${result?.message ?? "Unknown error"}`;
  }

  const recordIds = result.recordIds ?? [];
  const recordSummary = recordIds.length
    ? ` Record IDs: ${recordIds.join(", ")}.`
    : "";

  return `Saved ${result.count ?? fallbackCount} site diary record(s) successfully.${recordSummary}`;
}
