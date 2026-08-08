const MARKETING_PATH_PATTERN = /^\/(?:en|lv|ru)\/Landing(?:\/|$)/;

export function isMarketingAnalyticsPath(pathname: string) {
  return MARKETING_PATH_PATTERN.test(pathname);
}
