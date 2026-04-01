import enMessages from "@/messages/en.json";
import lvMessages from "@/messages/lv.json";

export type DashboardLanguage = "en" | "lv";

const MESSAGE_BY_LANGUAGE = {
  en: enMessages,
  lv: lvMessages,
} as const;

type DashboardDictionary = typeof enMessages.Dashboard;

type DashboardStaticDictionary = typeof enMessages.DashboardStatic;

export type DashboardTranslationKey = keyof DashboardDictionary;

export function getDashboardLanguage(value?: string | null): DashboardLanguage {
  return value === "lv" ? "lv" : "en";
}

export function tDashboard(language: DashboardLanguage, key: DashboardTranslationKey): string {
  return MESSAGE_BY_LANGUAGE[language].Dashboard[key] ?? enMessages.Dashboard[key];
}

export function translateStaticUiText(language: DashboardLanguage, text: string): string {
  if (language !== "lv") return text;
  return (MESSAGE_BY_LANGUAGE.lv.DashboardStatic as DashboardStaticDictionary)[text as keyof DashboardStaticDictionary]
    ?? text;
}
