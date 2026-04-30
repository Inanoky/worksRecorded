import { normalizeOrganizationLanguage, type OrganizationLanguage } from "@/lib/dashboard-i18n";

type JoyrideStep = { target: string; content: string; disableBeacon?: boolean };

type JoyrideStepsBundle = {
  steps_dashboard: JoyrideStep[];
  steps_dashboard_sites_new: JoyrideStep[];
  steps_dashboard_sites_open_project: JoyrideStep[];
  steps_dashboard_siteid_dashboard: JoyrideStep[];
  steps_dashboard_siteid_site_diary: JoyrideStep[];
  steps_ai_widget_open: JoyrideStep[];
};

const JOYRIDE_STEPS: Record<OrganizationLanguage, JoyrideStepsBundle> = {
  en: {
    steps_dashboard: [{ target: '[data-tour="create-project"]', content: 'Welcome to WorksRecorded site records! Start by creating a new project', disableBeacon: true }],
    steps_dashboard_sites_new: [{ target: '[data-tour="sites/new/card"]', content: 'Type in your project information', disableBeacon: true }],
    steps_dashboard_sites_open_project: [{ target: '[data-tour="dashboard/page"]', content: 'Open your project', disableBeacon: true }],
    steps_dashboard_siteid_dashboard: [
      { target: '[data-tour="calendar"]', content: 'Start reporting works from WhatsApp', disableBeacon: true },
      { target: '[data-tour="AI-widget"]', content: 'You can also report from assistant or directly in the diary', disableBeacon: true },
    ],
    steps_dashboard_siteid_site_diary: [
      { target: '[data-tour="calendar"]', content: 'Start reporting works from WhatsApp', disableBeacon: true },
      { target: '[data-tour="AI-widget"]', content: 'Open AI assistant and report what has been completed today.', disableBeacon: true },
    ],
    steps_ai_widget_open: [{ target: '[data-tour="AI-widget-open"]', content: 'Start typing to tell the AI what was completed today. You can say: Today 5 workers cast 10m3, and 3 workers did steel fixing for 5 hours.', disableBeacon: true }],
  },
  lv: {
    steps_dashboard: [{ target: '[data-tour="create-project"]', content: 'Laipni lūdzam WorksRecorded! Sāciet ar jauna projekta izveidi.', disableBeacon: true }],
    steps_dashboard_sites_new: [{ target: '[data-tour="sites/new/card"]', content: 'Ievadiet projekta informāciju', disableBeacon: true }],
    steps_dashboard_sites_open_project: [{ target: '[data-tour="dashboard/page"]', content: 'Atveriet savu projektu', disableBeacon: true }],
    steps_dashboard_siteid_dashboard: [
      { target: '[data-tour="calendar"]', content: 'Sāciet darbu uzskaiti no WhatsApp', disableBeacon: true },
      { target: '[data-tour="AI-widget"]', content: 'Varat uzskaitīt arī ar asistentu vai tieši žurnālā', disableBeacon: true },
    ],
    steps_dashboard_siteid_site_diary: [
      { target: '[data-tour="calendar"]', content: 'Sāciet darbu uzskaiti no WhatsApp', disableBeacon: true },
      { target: '[data-tour="AI-widget"]', content: 'Atveriet AI asistentu un aprakstiet, kas šodien paveikts.', disableBeacon: true },
    ],
    steps_ai_widget_open: [{ target: '[data-tour="AI-widget-open"]', content: 'Sāciet rakstīt AI asistentam, kas šodien tika paveikts.', disableBeacon: true }],
  },
};

export function getJoyRideSteps(language?: string | null): JoyrideStepsBundle {
  return JOYRIDE_STEPS[normalizeOrganizationLanguage(language)];
}
