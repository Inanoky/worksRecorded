import Image from "next/image";
import { FLOW_MODULE_KEYS, type FlowModuleKey } from "@/lib/flows/types";
import tgemLogo from "@/lib/images/tgem-logo.png";

export function DashboardOrganizationBrand({
	flowModuleKey,
}: {
	flowModuleKey?: FlowModuleKey | null;
}) {
	if (flowModuleKey !== FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL) return null;

	return (
		<div className="relative h-10 w-30 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white sm:h-13 sm:w-40">
			<Image
				src={tgemLogo}
				alt="TGEM"
				fill
				sizes="(min-width: 640px) 160px, 120px"
				className="object-cover object-[center_45%]"
			/>
		</div>
	);
}
