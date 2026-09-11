import { FLOW_MODULE_KEYS, type FlowModuleDefinition } from "@/lib/flows/types";

export const tgemInvoiceApprovalFlowModule = {
	key: FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL,
	name: "TGEM Invoice Approval",
	description:
		"TGEM invoice approval workflow with document OCR, review, controlled approvers, and cost allocation.",
	category: "invoice-approval",
	clientFlowId: "tgem",
	configurableAreas: [
		"approval steps",
		"invoice fields",
		"cost codes",
		"navigation",
	],
	ui: {
		showDashboardAiWidget: false,
		showSiteDiaryAiWidget: false,
	},
	entryPoints: {
		frontend: ["flows/tgem-invoice-approval/frontend.ts"],
		backend: [
			"flows/tgem-invoice-approval/backend.ts",
			"flows/tgem-invoice-approval/backend/whatsapp-route.ts",
		],
	},
} satisfies FlowModuleDefinition;
