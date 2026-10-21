import { getDefaultConstructionForma2Results } from "@/flows/default-construction/backend/forma2-analytics-actions";
import { DefaultConstructionForma2View } from "@/flows/default-construction/frontend/DefaultConstructionForma2View";
import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
import { requireUser } from "@/lib/utils/requireUser";
import {
	getOrganizationLanguageByUserId,
	orgCheck,
} from "@/server/actions/shared-actions";

export default async function AnalyticsPage({
	params,
}: {
	params: Promise<{ siteId: string }>;
}) {
	const { siteId } = await params;
	const user = await requireUser();
	const site = await orgCheck(user.id, siteId);
	if (!site) throw new Error("Site not found");
	if (site.organizationId === LIMENI_ORGANIZATION_ID) return null;
	const [organizationLanguage, data] = await Promise.all([
		getOrganizationLanguageByUserId(user.id),
		getDefaultConstructionForma2Results(siteId),
	]);
	return (
		<DefaultConstructionForma2View
			siteId={siteId}
			data={data}
			organizationLanguage={organizationLanguage}
		/>
	);
}
