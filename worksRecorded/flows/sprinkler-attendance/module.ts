import { FLOW_MODULE_KEYS, type FlowModuleDefinition } from "@/lib/flows/types";

export const sprinklerAttendanceFlowModule = {
	key: FLOW_MODULE_KEYS.SPRINKLER_ATTENDANCE,
	name: "Sprinkler WhatsApp darba laika uzskaite",
	description: "Darbinieku WhatsApp darba laika pārskats Sprinkler projektos.",
	category: "construction",
	clientFlowId: "default",
	configurableAreas: [
		"darba laika panelis",
		"darbinieku WhatsApp reģistrācija",
	],
	ui: {
		showDashboardAiWidget: false,
		showSiteDiaryAiWidget: false,
		hideOrganizationMaterialSettings: true,
		hideBisSettings: true,
		hideSiteAreaSettings: true,
	},
	entryPoints: {
		frontend: [
			"flows/sprinkler-attendance/frontend.ts",
			"flows/sprinkler-attendance/frontend",
		],
		backend: ["flows/default-production/backend/worker.ts"],
	},
} satisfies FlowModuleDefinition;
