import { AsyncLocalStorage } from "node:async_hooks";

export type SiteManagerToolContext = {
  userId: string;
  siteId: string;
  originalUserComment: string;
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

export function runWithSiteDiaryToolContext<T>(
  context: SiteDiaryToolContext,
  fn: () => Promise<T>,
): Promise<T> {
  return runWithSiteManagerToolContext(context, fn);
}

export function getSiteDiaryToolContext() {
  return getSiteManagerToolContext();
}
