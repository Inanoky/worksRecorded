export const SUPPORTED_TOUR_LANGS = ["en", "es"] as const;

export type TourLang = (typeof SUPPORTED_TOUR_LANGS)[number];

type TourDictionary = {
  joyrideLocale: {
    back: string;
    close: string;
    last: string;
    next: string;
    open: string;
    skip: string;
  };
  steps: {
    dashboard: string;
    dashboardSitesNew: string;
    dashboardSitesOpenProject: string;
    siteDashboardCalendar: string;
    siteDashboardAiWidget: string;
    siteDiaryCalendar: string;
    siteDiaryAiWidget: string;
    aiWidgetOpen: string;
  };
};

const TOUR_DICTIONARY: Record<TourLang, TourDictionary> = {
  en: {
    joyrideLocale: {
      back: "Back",
      close: "Close",
      last: "Done",
      next: "Next",
      open: "Open",
      skip: "Skip",
    },
    steps: {
      dashboard: "Welcome to WorksRecorded! Start by creating a new project.",
      dashboardSitesNew: "Enter your project information here.",
      dashboardSitesOpenProject: "Open your project to continue.",
      siteDashboardCalendar: "Start reporting work from WhatsApp.",
      siteDashboardAiWidget: "You can also report from the assistant or directly in the diary.",
      siteDiaryCalendar: "Start reporting work from WhatsApp.",
      siteDiaryAiWidget: "Open the AI assistant and report what was completed today.",
      aiWidgetOpen:
        "Start typing what was completed today. Example: \"Today 5 workers cast 10m³ of concrete, and 3 workers did steel fixing for 5 additional hours. Timber delivery was delayed.\"",
    },
  },
  es: {
    joyrideLocale: {
      back: "Atrás",
      close: "Cerrar",
      last: "Finalizar",
      next: "Siguiente",
      open: "Abrir",
      skip: "Omitir",
    },
    steps: {
      dashboard: "¡Bienvenido a WorksRecorded! Empieza creando un nuevo proyecto.",
      dashboardSitesNew: "Introduce aquí la información del proyecto.",
      dashboardSitesOpenProject: "Abre tu proyecto para continuar.",
      siteDashboardCalendar: "Empieza a registrar avances desde WhatsApp.",
      siteDashboardAiWidget: "También puedes registrar avances desde el asistente o directamente en el diario.",
      siteDiaryCalendar: "Empieza a registrar avances desde WhatsApp.",
      siteDiaryAiWidget: "Abre el asistente de IA y reporta lo que se completó hoy.",
      aiWidgetOpen:
        "Empieza a escribir lo completado hoy. Ejemplo: \"Hoy 5 trabajadores vaciaron 10 m³ de concreto y 3 hicieron colocación de acero durante 5 horas extra. La entrega de madera se retrasó.\"",
    },
  },
};

export function resolveTourLang(langLike?: string | null): TourLang {
  if (!langLike) return "en";
  const normalized = langLike.toLowerCase().split("-")[0] as TourLang;
  return SUPPORTED_TOUR_LANGS.includes(normalized) ? normalized : "en";
}

export function getTourCopy(langLike?: string | null): TourDictionary {
  return TOUR_DICTIONARY[resolveTourLang(langLike)];
}
