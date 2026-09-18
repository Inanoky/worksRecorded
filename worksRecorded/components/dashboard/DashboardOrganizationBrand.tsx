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
		<div className="relative h-12 w-36 shrink-0 overflow-hidden rounded-md bg-white sm:h-16 sm:w-48 lg:h-20 lg:w-60">
			<Image
				src={tgemLogo}
				alt="TGEM"
				fill
				sizes="(min-width: 1024px) 240px, (min-width: 640px) 192px, 144px"
				className="object-cover object-[center_45%]"
			/>
		</div>
	);
}
