import { FLOW_MODULE_KEYS, type FlowModuleDefinition } from "@/lib/flows/types";

export const fimaFlowModule = {
	key: FLOW_MODULE_KEYS.FIMA,
	name: "FIMA · BIS darbu uzskaite",
	description:
		"KUCE atskaišu imports, darbu priekšlikumi, pārbaude un BIS sagatavju pārvaldība.",
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
		backend: ["flows/fima/backend"],
	},
} satisfies FlowModuleDefinition;
