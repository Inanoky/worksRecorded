import { Bot, HardHat, Wrench, ReceiptText, Clock8, Package } from "lucide-react";
import { getNavigationMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";

export function getNavLinks(language?: string | null) {
  const t = getNavigationMessages(normalizeOrganizationLanguage(language));

  return [
    { name: t.projects, href: "/dashboard/sites", icon: HardHat },
    { name: t.organizationSettings, href: "/dashboard/settings", icon: Wrench },
  ];
}

export function getProjectNavLinks(language?: string | null, options?: { canAccessAiContext?: boolean }) {
  const t = getNavigationMessages(normalizeOrganizationLanguage(language));

  const links = [
    { name: t.siteDiary, href: "/dashboard/dashboard", path: "dashboard", icon: ReceiptText },
    { name: t.timesheets, href: "/dashboard/timesheets", path: "timesheets", icon: Clock8 },
    { name: t.warehouse, href: "/dashboard/BIS", path: "BIS", icon: Package },
    { name: "AI Context", href: "/dashboard/ai-context", path: "ai-context", icon: Bot },
    { name: t.settings, href: "/dashboard/settings", path: "settings", icon: Wrench },
  ];

  if (options?.canAccessAiContext) return links;
  return links.filter((link) => link.path !== "ai-context");
}
