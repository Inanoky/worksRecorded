import { FLOW_MODULE_KEYS, type FlowModuleDefinition } from "@/lib/flows/types";

export const tgemInvoiceApprovalFlowModule = {
  key: FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL,
  name: "TGEM Invoice Approval",
  description: "TGEM invoice approval mockup flow with invoice list, OCR preview, approvers, and cost-code screens.",
  category: "invoice-approval",
  clientFlowId: "tgem",
  configurableAreas: ["approval steps", "invoice fields", "cost codes", "navigation"],
  entryPoints: {
    frontend: [
      "flows/tgem-invoice-approval/frontend.ts",
    ],
    backend: [],
  },
} satisfies FlowModuleDefinition;
