import type { Prisma } from "@prisma/client";
import { readFimaBisRecordLinks } from "@/lib/fima/bis-record-links";
import {
	type FimaCollaboration,
	readFimaCollaboration,
} from "@/lib/fima/diary-collaboration";
import type { FimaExampleSources } from "@/lib/fima/example-sources";
import type { FimaRecordActCoverage } from "@/lib/fima/acceptance-acts";
import type { DefaultConstructionCostRecord } from "../lib/site-diary-productivity-settings";
import { readSectionMappingSource } from "../lib/section-mapping-source";
import {
	commonDiaryListSelect,
	mapCommonDiaryListRecord,
} from "@/lib/site-diary/list-record";

export const constructionDiaryListSelect = {
	...commonDiaryListSelect,
	fimaNumber: true,
	evalMetadata: true,
} as const satisfies Prisma.sitediaryrecordsSelect;

export type ConstructionDiaryListRow = ReturnType<
	typeof mapCommonDiaryListRecord
> & {
	fimaNumber?: number | null;
	fimaExampleSources?: FimaExampleSources;
	fimaBisRecords?: ReturnType<typeof readFimaBisRecordLinks>;
	fimaActCoverage?: FimaRecordActCoverage;
	hasFimaBisReferences?: boolean;
	fimaCollaboration?: FimaCollaboration;
	beginSalaryAllocation?: DefaultConstructionCostRecord["beginSalaryAllocation"];
	sectionMapping?: ReturnType<typeof readSectionMappingSource>;
};

export function mapConstructionDiaryListRecord(
	rec: Record<string, any>,
): ConstructionDiaryListRow {
	const cost = rec.evalMetadata?.beginSalaryAllocation;
	return {
		...mapCommonDiaryListRecord(rec),
		sectionMapping: readSectionMappingSource(rec.evalMetadata),
		...(cost ? { beginSalaryAllocation: { kind: cost.kind, currency: cost.currency, sourceReportId: cost.sourceReportId, planSha256: cost.planSha256, totalCents: cost.totalCents } } : {}),
		fimaNumber: rec.fimaNumber ?? null,
		fimaBisRecords: readFimaBisRecordLinks(rec.evalMetadata, rec.BISId),
		hasFimaBisReferences:
			Array.isArray(rec.evalMetadata?.kuceImport?.bisLinks) &&
			rec.evalMetadata.kuceImport.bisLinks.length > 0,
		fimaCollaboration: rec.evalMetadata?.fimaCollaboration
			? readFimaCollaboration(rec.evalMetadata)
			: undefined,
	};
}
