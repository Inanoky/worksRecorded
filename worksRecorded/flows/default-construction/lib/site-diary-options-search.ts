export type SearchableWorkDraft = {
  savedWork: string;
  work: string;
};

export function matchesPersistedWorkSearch(
  draft: SearchableWorkDraft,
  normalizedSearch: string,
) {
  const searchableWork = draft.savedWork || draft.work;
  return searchableWork
    .toLocaleLowerCase("lv")
    .includes(normalizedSearch);
}
