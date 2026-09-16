import { notFound } from "next/navigation";

import { TgemInvoiceApprovalDashboard } from "@/flows/tgem-invoice-approval/frontend";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

function firstValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export default async function TgemInvoicesPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const user = await requireUser();
	const [dbUser, rawSearchParams] = await Promise.all([
		prisma.user.findFirst({
			where: { id: user.id, status: "active" },
			select: {
				organizationId: true,
				organization: { select: { orgLanguage: true } },
			},
		}),
		searchParams,
	]);
	if (!dbUser?.organizationId) notFound();

	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		organizationId: dbUser.organizationId,
	});
	if (flowModuleKey !== FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL) notFound();

	return (
		<TgemInvoiceApprovalDashboard
			initialProjectFilter={firstValue(rawSearchParams.project) ?? null}
			initialView={
				firstValue(rawSearchParams.view) === "approval"
					? "approval"
					: "register"
			}
			organizationLanguage={dbUser.organization?.orgLanguage}
		/>
	);
}
