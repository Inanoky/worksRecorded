import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
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
	result.otherSettings = {
		...result.otherSettings,
		inlineDiaryPhotos: hasInlineDiaryPhotos(site.organizationId ?? null),
		visualConstruction: hasInlineDiaryPhotos(site.organizationId ?? null),
	};
	return withFimaDiaryColumns(
		result,
		site.bisCaseNumber ?? null,
		site.bisCaseId ?? null,
	);
}
