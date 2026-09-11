import { handleSiteManagerRoute } from "@/flows/default-construction/backend";
import { handleTgemInvoiceWhatsappRoute } from "@/flows/tgem-invoice-approval/backend";
import { FLOW_MODULE_KEYS, type FlowModuleKey } from "@/lib/flows/types";

export async function routeRegisteredWhatsappUserByFlow(args: {
	flowModuleKey: FlowModuleKey;
	from: string | null;
	formData: FormData;
	user: { id: string } & Record<string, unknown>;
}) {
	if (args.flowModuleKey === FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL) {
		await handleTgemInvoiceWhatsappRoute(args);
		return "tgem_invoice" as const;
	}

	await handleSiteManagerRoute(args);
	return "site_manager" as const;
}
