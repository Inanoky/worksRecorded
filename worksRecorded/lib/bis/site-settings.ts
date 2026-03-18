export type BisSiteSettings = {
  selectedCaseId?: string | null;
  selectedCaseLabel?: string | null;
};

export function readBisSiteSettings(value: unknown): BisSiteSettings {
  if (!value || typeof value !== "object") return {};
  const siteMap = value as Record<string, unknown>;
  const bis = siteMap.bis;

  if (!bis || typeof bis !== "object") return {};

  const settings = bis as Record<string, unknown>;
  return {
    selectedCaseId: typeof settings.selectedCaseId === "string" ? settings.selectedCaseId : null,
    selectedCaseLabel:
      typeof settings.selectedCaseLabel === "string" ? settings.selectedCaseLabel : null,
  };
}

export function writeBisSiteSettings(existing: unknown, next: BisSiteSettings) {
  const base = existing && typeof existing === "object" ? { ...(existing as Record<string, unknown>) } : {};

  return {
    ...base,
    bis: {
      ...(base.bis && typeof base.bis === "object" ? (base.bis as Record<string, unknown>) : {}),
      selectedCaseId: next.selectedCaseId ?? null,
      selectedCaseLabel: next.selectedCaseLabel ?? null,
    },
  };
}
