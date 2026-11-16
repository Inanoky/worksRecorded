import { notFound } from "next/navigation";
import { TgemInvoiceSettings } from "@/flows/tgem-invoice-approval/frontend/TgemInvoiceSettings";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

export default async function TgemInvoiceSettingsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const user = await requireUser();
	const [dbUser, params] = await Promise.all([
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
	const flow = await resolveFlowModuleKeyForRuntime({
		organizationId: dbUser.organizationId,
	});
	if (flow !== FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL) notFound();
	const scope = JSON.stringify([user.id, dbUser.organizationId]);
	const project = Array.isArray(params.project)
		? params.project[0]
		: params.project;
	return (
		<TgemInvoiceSettings
			key={scope}
			cacheScope={scope}
			projectFilter={project ?? null}
			organizationLanguage={dbUser.organization?.orgLanguage}
		/>
	);
}
