export type SiteDiaryMediaDisplayRow = {
  originalAudioUrl?: string | null;
};

export type SiteDiaryMediaDisplayGroup = {
  photoCount?: number | null;
  rows?: SiteDiaryMediaDisplayRow[] | null;
};

export function hasSiteDiaryDisplayableMedia(group: SiteDiaryMediaDisplayGroup) {
  if (Number(group.photoCount ?? 0) > 0) return true;

  return (group.rows ?? []).some((row) => {
    const audioUrl = typeof row.originalAudioUrl === "string" ? row.originalAudioUrl.trim() : "";
    return audioUrl.length > 0;
  });
}
