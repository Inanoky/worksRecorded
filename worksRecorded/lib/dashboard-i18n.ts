export type DashboardLanguage = "en" | "lv";

export const DASHBOARD_TRANSLATIONS = {
  en: {
    navProjects: "Projects",
    navCompanySettings: "Company Settings",
    navSiteDiary: "Site Diary",
    navTimesheets: "Timesheets",
    navWarehouse: "Warehouse",
    navSettings: "Settings",
    repeatTutorial: "Repeat Tutorial",
    contactUs: "Contact us",
    contactDescription: "Contact us any time if you have any questions or problems.",
    email: "Email",
    phone: "Phone",
    close: "Close",
    emailUs: "Email us",
    logOut: "Log out",
    companySettingsTitle: "Company Settings",
    inviteColleaguesTitle: "Invite colleagues",
    inviteColleaguesDescription: "Manage your team and send invitations.",
    dashboardLanguage: "Dashboard language",
    dashboardLanguageDescription: "Choose the language used in /dashboard and all child pages for static UI text.",
    english: "English",
    latvian: "Latvian",
    languageUpdated: "Language updated",
    languageUpdateFailed: "Failed to update language",
  },
  lv: {
    navProjects: "Projekti",
    navCompanySettings: "Uzņēmuma iestatījumi",
    navSiteDiary: "Būvdarbu žurnāls",
    navTimesheets: "Darba laika uzskaite",
    navWarehouse: "Noliktava",
    navSettings: "Iestatījumi",
    repeatTutorial: "Atkārtot pamācību",
    contactUs: "Sazināties ar mums",
    contactDescription: "Sazinieties ar mums jebkurā laikā, ja jums ir jautājumi vai problēmas.",
    email: "E-pasts",
    phone: "Tālrunis",
    close: "Aizvērt",
    emailUs: "Rakstīt e-pastu",
    logOut: "Izrakstīties",
    companySettingsTitle: "Uzņēmuma iestatījumi",
    inviteColleaguesTitle: "Uzaicināt kolēģus",
    inviteColleaguesDescription: "Pārvaldiet komandu un sūtiet uzaicinājumus.",
    dashboardLanguage: "Paneļa valoda",
    dashboardLanguageDescription: "Izvēlieties valodu, kas tiek lietota /dashboard un visās apakšlapās statiskajam UI tekstam.",
    english: "Angļu",
    latvian: "Latviešu",
    languageUpdated: "Valoda atjaunināta",
    languageUpdateFailed: "Neizdevās atjaunināt valodu",
  },
} as const;

export type DashboardTranslationKey = keyof (typeof DASHBOARD_TRANSLATIONS)["en"];

export function getDashboardLanguage(value?: string | null): DashboardLanguage {
  return value === "lv" ? "lv" : "en";
}

export function tDashboard(language: DashboardLanguage, key: DashboardTranslationKey): string {
  return DASHBOARD_TRANSLATIONS[language][key] ?? DASHBOARD_TRANSLATIONS.en[key];
}

const LV_STATIC_TEXT_MAP: Record<string, string> = {
  "Save": "Saglabāt",
  "Save changes": "Saglabāt izmaiņas",
  "Save Changes": "Saglabāt izmaiņas",
  "Cancel": "Atcelt",
  "Close": "Aizvērt",
  "Delete": "Dzēst",
  "Edit": "Rediģēt",
  "Add": "Pievienot",
  "Add user": "Pievienot lietotāju",
  "Invite user": "Uzaicināt lietotāju",
  "Send invite": "Nosūtīt uzaicinājumu",
  "Export to Excel": "Eksportēt uz Excel",
  "Search...": "Meklēt...",
  "Settings": "Iestatījumi",
  "Warehouse": "Noliktava",
  "Timesheets": "Darba laika uzskaite",
  "Time records": "Laika ieraksti",
  "Go Back": "Atpakaļ",
  "Name": "Nosaukums",
  "Description": "Apraksts",
  "Subdirectory": "Apakšdirektorija",
  "Danger": "Bīstami",
  "Actions": "Darbības",
  "No data found.": "Dati nav atrasti.",
  "Enabled": "Iespējots",
  "Disabled": "Atspējots",
  "Projects": "Projekti",
  "Company Settings": "Uzņēmuma iestatījumi",
  "Site Diary": "Būvdarbu žurnāls",
  "Log out": "Izrakstīties",
  "Contact us": "Sazināties ar mums",
};

export function translateStaticUiText(language: DashboardLanguage, text: string): string {
  if (language !== "lv") return text;
  return LV_STATIC_TEXT_MAP[text] ?? text;
}
