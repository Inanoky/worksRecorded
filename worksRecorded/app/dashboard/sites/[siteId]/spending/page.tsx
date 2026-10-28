import { notFound } from "next/navigation";
import { DefaultConstructionSpending } from "@/flows/default-construction/frontend/DefaultConstructionSpending";
import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";

export default async function SpendingPage({
	params,
}: {
	params: Promise<{ siteId: string }>;
}) {
	const { siteId } = await params;
	const user = await requireUser();
	const site = await orgCheck(user.id, siteId);
	if (!site || site.organizationId !== LIMENI_ORGANIZATION_ID) notFound();
	return <DefaultConstructionSpending />;
}
