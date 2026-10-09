import { FLOW_MODULE_KEYS, type FlowModuleDefinition } from "@/lib/flows/types";

export const fimaFlowModule = {
	key: FLOW_MODULE_KEYS.FIMA,
	name: "FIMA · BIS darbu uzskaite",
	description:
		"FIMA darbu uzskaites un BIS ierakstu pārskata dizaina prototips.",
	category: "construction",
	clientFlowId: "default",
	configurableAreas: [
		"BIS darbu pārskats",
		"FIMA piezīmes",
		"ierakstu statusi",
	],
	ui: {
		showDashboardAiWidget: false,
		showSiteDiaryAiWidget: false,
		showPhotoExport: true,
		projectNavigation: {
			dashboard: {
				label: "BIS overview",
				labelLv: "BIS pārskats",
				description: "Work records and BIS follow-up",
				descriptionLv: "Darbu uzskaite un BIS ierakstu pārbaude",
			},
		},
	},
	entryPoints: {
		frontend: ["flows/fima/frontend.ts", "flows/fima/frontend"],
		backend: [],
	},
} satisfies FlowModuleDefinition;
