import { normalizeOrganizationLanguage, type OrganizationLanguage } from "@/lib/dashboard-i18n";

type JoyrideStep = { target: string; content: string; disableBeacon?: boolean };

type JoyrideStepsBundle = {
  steps_dashboard: JoyrideStep[];
  steps_dashboard_sites_new: JoyrideStep[];
  steps_dashboard_create_project_cta: JoyrideStep[];
  steps_dashboard_sites_open_project: JoyrideStep[];
  steps_dashboard_siteid_dashboard: JoyrideStep[];
  steps_dashboard_siteid_site_diary: JoyrideStep[];
  steps_ai_widget_open: JoyrideStep[];
  steps_siteid_warehouse: JoyrideStep[];
  steps_siteid_settings: JoyrideStep[];
  steps_siteid_timesheets: JoyrideStep[];
};

const JOYRIDE_STEPS: Record<OrganizationLanguage, JoyrideStepsBundle> = {
  en: {
    steps_dashboard: [{ target: '[data-tour="create-project"]', content: 'Welcome to WorksRecorded site records! Start by creating a new project', disableBeacon: true }],
    steps_dashboard_create_project_cta: [{ target: '[data-tour="create-project"]', content: 'Create your first project here.', disableBeacon: true }],
    steps_dashboard_sites_new: [{ target: '[data-tour="sites/new/card"]', content: 'Type in your project information', disableBeacon: true }],
    steps_dashboard_sites_open_project: [{ target: '[data-tour="dashboard/page"]', content: 'Open your newly created project from this card.', disableBeacon: true }],
    steps_dashboard_siteid_dashboard: [
      { target: '[data-tour="calendar"]', content: 'Start reporting works from WhatsApp', disableBeacon: true },
      { target: '[data-tour="AI-widget"]', content: 'You can also report from assistant or directly in the diary', disableBeacon: true },
    ],
    steps_dashboard_siteid_site_diary: [
      { target: '[data-tour="calendar"]', content: 'Start reporting works from WhatsApp', disableBeacon: true },
      { target: '[data-tour="AI-widget"]', content: 'Open AI assistant and report what has been completed today.', disableBeacon: true },
    ],
    steps_ai_widget_open: [{ target: '[data-tour="AI-widget-open"]', content: 'Start typing to tell the AI what was completed today. You can say: Today 5 workers cast 10m3, and 3 workers did steel fixing for 5 hours.', disableBeacon: true }],
    steps_siteid_timesheets: [
      { target: '[data-tour="timesheets-workers"]', content: 'Check who is assigned to this project before reviewing logs.', disableBeacon: true },
      { target: '[data-tour="timesheets"]', content: 'Review, search, and edit time records in this section.', disableBeacon: true },
      { target: '[data-tour="AI-widget"]', content: 'Need help? Use AI assistant for quick summaries and guidance.', disableBeacon: true },
    ],
    steps_siteid_settings: [
      { target: '[data-tour="settings-image"]', content: 'Upload a project image to make the workspace easier to recognize.', disableBeacon: true },
      { target: '[data-tour="settings-bis"]', content: 'Connect BIS and choose the linked case for this project.', disableBeacon: true },
      { target: '[data-tour="settings-site-info"]', content: 'Update project details and site geofence settings here.', disableBeacon: true },
      { target: '[data-tour="settings-danger-zone"]', content: 'Danger zone: deleting a project permanently removes related data.', disableBeacon: true },
    ],
    steps_siteid_warehouse: [
      { target: '[data-tour="warehouse-header"]', content: 'Warehouse keeps all material records for this project.', disableBeacon: true },
      { target: '[data-tour="warehouse-table"]', content: 'Use this table to filter, edit, and sync materials with BIS.', disableBeacon: true },
      { target: '[data-tour="AI-widget"]', content: 'Use AI assistant to summarize material activity when needed.', disableBeacon: true },
    ],
  },
  lv: {
    steps_dashboard: [{ target: '[data-tour="create-project"]', content: 'Laipni lūdzam WorksRecorded! Sāciet ar jauna projekta izveidi.', disableBeacon: true }],
    steps_dashboard_create_project_cta: [{ target: '[data-tour="create-project"]', content: 'Šeit izveidojiet savu pirmo projektu.', disableBeacon: true }],
    steps_dashboard_sites_new: [{ target: '[data-tour="sites/new/card"]', content: 'Ievadiet projekta informāciju', disableBeacon: true }],
    steps_dashboard_sites_open_project: [{ target: '[data-tour="dashboard/page"]', content: 'Atveriet tikko izveidoto projektu no šīs kartītes.', disableBeacon: true }],
    steps_dashboard_siteid_dashboard: [
      { target: '[data-tour="calendar"]', content: 'Sāciet darbu uzskaiti no WhatsApp', disableBeacon: true },
      { target: '[data-tour="AI-widget"]', content: 'Varat uzskaitīt arī ar asistentu vai tieši žurnālā', disableBeacon: true },
    ],
    steps_dashboard_siteid_site_diary: [
      { target: '[data-tour="calendar"]', content: 'Sāciet darbu uzskaiti no WhatsApp', disableBeacon: true },
      { target: '[data-tour="AI-widget"]', content: 'Atveriet AI asistentu un aprakstiet, kas šodien paveikts.', disableBeacon: true },
    ],
    steps_ai_widget_open: [{ target: '[data-tour="AI-widget-open"]', content: 'Sāciet rakstīt AI asistentam, kas šodien tika paveikts.', disableBeacon: true }],
    steps_siteid_timesheets: [
      { target: '[data-tour="timesheets-workers"]', content: 'Pārskatiet objektam piesaistītos darbiniekus.', disableBeacon: true },
      { target: '[data-tour="timesheets"]', content: 'Šeit varat meklēt, pārskatīt un rediģēt darba laika ierakstus.', disableBeacon: true },
      { target: '[data-tour="AI-widget"]', content: 'AI asistents var palīdzēt ar kopsavilkumiem un skaidrojumiem.', disableBeacon: true },
    ],
    steps_siteid_settings: [
      { target: '[data-tour="settings-image"]', content: 'Augšupielādējiet projekta attēlu ērtākai orientācijai.', disableBeacon: true },
      { target: '[data-tour="settings-bis"]', content: 'Pieslēdziet BIS un izvēlieties ar objektu saistīto lietu.', disableBeacon: true },
      { target: '[data-tour="settings-site-info"]', content: 'Šeit var atjaunināt objekta informāciju un geofence iestatījumus.', disableBeacon: true },
      { target: '[data-tour="settings-danger-zone"]', content: 'Bīstamā zona: objekta dzēšana neatgriezeniski dzēsīs datus.', disableBeacon: true },
    ],
    steps_siteid_warehouse: [
      { target: '[data-tour="warehouse-header"]', content: 'Noliktavā redzami visi šī objekta materiālu ieraksti.', disableBeacon: true },
      { target: '[data-tour="warehouse-table"]', content: 'Izmantojiet tabulu filtrēšanai, rediģēšanai un BIS sinhronizācijai.', disableBeacon: true },
      { target: '[data-tour="AI-widget"]', content: 'AI asistents palīdz ātri apkopot materiālu aktivitāti.', disableBeacon: true },
    ],
  },
};

export function getJoyRideSteps(language?: string | null): JoyrideStepsBundle {
  return JOYRIDE_STEPS[normalizeOrganizationLanguage(language)];
}
