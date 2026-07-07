import { AsyncLocalStorage } from "node:async_hooks";

export type SiteManagerToolContext = {
  userId: string;
  siteId: string;
  originalUserComment: string;
  savedConfirmationRecords?: SiteDiaryConfirmationRecord[];
};

export type SiteDiaryConfirmationRecord = {
  Date?: string | Date | null;
  Location?: string | null;
  Works?: string | null;
  Comments?: string | null;
  Units?: string | null;
  Amounts?: number | null;
  WorkersInvolved?: number | null;
  TimeInvolved?: number | null;
};

export type SiteDiaryToolContext = SiteManagerToolContext;

const siteManagerToolStorage = new AsyncLocalStorage<SiteManagerToolContext>();

export function runWithSiteManagerToolContext<T>(
  context: SiteManagerToolContext,
  fn: () => Promise<T>,
): Promise<T> {
  return siteManagerToolStorage.run(context, fn);
}

export function getSiteManagerToolContext() {
  return siteManagerToolStorage.getStore();
}

export function setSiteManagerSavedConfirmationRecords(
  records: SiteDiaryConfirmationRecord[],
) {
  const context = getSiteManagerToolContext();
  if (!context) return;
  context.savedConfirmationRecords = records;
}

export function getSiteManagerSavedConfirmationRecords() {
  return getSiteManagerToolContext()?.savedConfirmationRecords ?? [];
}

export function runWithSiteDiaryToolContext<T>(
  context: SiteDiaryToolContext,
  fn: () => Promise<T>,
): Promise<T> {
  return runWithSiteManagerToolContext(context, fn);
}

export function getSiteDiaryToolContext() {
  return getSiteManagerToolContext();
}
