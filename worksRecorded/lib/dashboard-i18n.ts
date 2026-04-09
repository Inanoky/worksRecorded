export type OrganizationLanguage = "en" | "lv";

type DashboardMessages = {
  createProject: string;
  openProject: string;
  yourSites: string;
  emptyTitle: string;
  emptyDescription: string;
};

const DASHBOARD_MESSAGES: Record<OrganizationLanguage, DashboardMessages> = {
  en: {
    createProject: "Create Project",
    openProject: "Open Project",
    yourSites: "Your Sites",
    emptyTitle: "You don't have any projects created",
    emptyDescription:
      "You currently don't have any projects. Please create one so you can see it here.",
  },
  lv: {
    createProject: "Izveidot projektu",
    openProject: "Atvērt projektu",
    yourSites: "Jūsu projekti",
    emptyTitle: "Jums vēl nav izveidotu projektu",
    emptyDescription:
      "Pašlaik jums nav projektu. Lūdzu, izveidojiet projektu, lai tas tiktu parādīts šeit.",
  },
};

export function normalizeOrganizationLanguage(
  language?: string | null,
): OrganizationLanguage {
  return language === "lv" ? "lv" : "en";
}

export function getDashboardMessages(language?: string | null) {
  return DASHBOARD_MESSAGES[normalizeOrganizationLanguage(language)];
}

