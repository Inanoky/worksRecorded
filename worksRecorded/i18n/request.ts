import {getRequestConfig} from "next-intl/server";

const locales = ["en", "lv"] as const;
type Locale = (typeof locales)[number];

export default getRequestConfig(async ({requestLocale}) => {
  const candidate = await requestLocale; // string | undefined
  const locale: Locale = locales.includes(candidate as Locale) ? (candidate as Locale) : "en";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});