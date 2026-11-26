import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
import { isProdevOrganization } from "@/lib/branding/prodev";
import { withFimaDiaryColumns } from "@/lib/fima/diary-collaboration";
import { hasInlineDiaryPhotos } from "./diary-photos";
import { applyDefaultConstructionQuantityProfile } from "./quantity-plan-actual";
import {
	setDefaultConstructionWorkDropdownOptions,
	withDefaultConstructionSystemWorks,
} from "./site-diary-productivity-settings";

export function buildDefaultConstructionDiaryConfig(site: {
	siteDiaryRecordsMap: unknown;
	organizationId?: string | null;
	organizationName?: string | null;
	bisCaseNumber?: string | null;
	bisCaseId?: string | null;
}) {
	const map = structuredClone(
		site.siteDiaryRecordsMap && typeof site.siteDiaryRecordsMap === "object"
			? (site.siteDiaryRecordsMap as Record<string, unknown>)
			: defaultConfig,
	);
	setDefaultConstructionWorkDropdownOptions(
		map,
		withDefaultConstructionSystemWorks(map),
	);
	const result = applyDefaultConstructionQuantityProfile(map);
	const { prodevBisReview: _prodevBisReview, ...otherSettings } =
		result.otherSettings ?? {};
	result.otherSettings = {
		...otherSettings,
		inlineDiaryPhotos: hasInlineDiaryPhotos(site.organizationId ?? null),
		visualConstruction: hasInlineDiaryPhotos(site.organizationId ?? null),
		...(isProdevOrganization(site.organizationName)
			? { prodevBisReview: true }
			: {}),
	};
	return withFimaDiaryColumns(
		result,
		site.bisCaseNumber ?? null,
		site.bisCaseId ?? null,
	);
}
