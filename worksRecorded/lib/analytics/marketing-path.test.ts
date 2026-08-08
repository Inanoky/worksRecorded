import { isMarketingAnalyticsPath } from "./marketing-path";

describe("isMarketingAnalyticsPath", () => {
  it.each(["/en/Landing", "/lv/Landing/Pricing", "/ru/Landing/ThankYou"])(
    "includes marketing path %s",
    (pathname) => {
      expect(isMarketingAnalyticsPath(pathname)).toBe(true);
    },
  );

  it.each(["/dashboard", "/dashboard/welcome", "/clock-in", "/api/auth/login"])(
    "excludes application path %s",
    (pathname) => {
      expect(isMarketingAnalyticsPath(pathname)).toBe(false);
    },
  );
});
