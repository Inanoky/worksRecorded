import { getTourCopy } from "@/components/joyride/i18n";

type TourStep = {
  target: string;
  content: string;
  disableBeacon?: boolean;
};

export function getStepsDashboard(lang?: string | null): TourStep[] {
  const { steps } = getTourCopy(lang);
  return [
    {
      target: '[data-tour="create-project"]',
      content: steps.dashboard,
      disableBeacon: true,
    },
  ];
}

export function getStepsDashboardSitesNew(lang?: string | null): TourStep[] {
  const { steps } = getTourCopy(lang);
  return [
    {
      target: '[data-tour="sites/new/card"]',
      content: steps.dashboardSitesNew,
      disableBeacon: true,
    },
  ];
}

export function getStepsDashboardSitesOpenProject(lang?: string | null): TourStep[] {
  const { steps } = getTourCopy(lang);
  return [
    {
      target: '[data-tour="dashboard/page"]',
      content: steps.dashboardSitesOpenProject,
      disableBeacon: true,
    },
  ];
}

export function getStepsDashboardSiteIdDashboard(lang?: string | null): TourStep[] {
  const { steps } = getTourCopy(lang);
  return [
    {
      target: '[data-tour="calendar"]',
      content: steps.siteDashboardCalendar,
      disableBeacon: true,
    },
    {
      target: '[data-tour="AI-widget"]',
      content: steps.siteDashboardAiWidget,
      disableBeacon: true,
    },
  ];
}

export function getStepsDashboardSiteIdSiteDiary(lang?: string | null): TourStep[] {
  const { steps } = getTourCopy(lang);
  return [
    {
      target: '[data-tour="calendar"]',
      content: steps.siteDiaryCalendar,
      disableBeacon: true,
    },
    {
      target: '[data-tour="AI-widget"]',
      content: steps.siteDiaryAiWidget,
      disableBeacon: true,
    },
  ];
}

export function getStepsAiWidgetOpen(lang?: string | null): TourStep[] {
  const { steps } = getTourCopy(lang);
  return [
    {
      target: '[data-tour="AI-widget-open"]',
      content: steps.aiWidgetOpen,
      disableBeacon: true,
    },
  ];
}

export const steps_dashboard = getStepsDashboard();
export const steps_dashboard_sites_new = getStepsDashboardSitesNew();
export const steps_dashboard_sites_open_project = getStepsDashboardSitesOpenProject();
export const steps_dashboard_siteid_dashboard = getStepsDashboardSiteIdDashboard();
export const steps_dashboard_siteid_site_diary = getStepsDashboardSiteIdSiteDiary();
export const steps_ai_widget_open = getStepsAiWidgetOpen();
