import type { Prisma } from "@prisma/client";
import type { FimaRecordActCoverage } from "@/lib/fima/acceptance-acts";
import { readFimaBisRecordLinks } from "@/lib/fima/bis-record-links";
import {
	type FimaCollaboration,
	readFimaCollaboration,
} from "@/lib/fima/diary-collaboration";
import type { FimaExampleSources } from "@/lib/fima/example-sources";
import {
	commonDiaryListSelect,
	mapCommonDiaryListRecord,
} from "@/lib/site-diary/list-record";
import {
	type ProdevBisReview,
	readProdevBisReview,
} from "@/lib/site-diary/prodev-bis-review";
import { readSectionMappingSource } from "../lib/section-mapping-source";
import type { DefaultConstructionCostRecord } from "../lib/site-diary-productivity-settings";

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
	prodevBisReview?: ProdevBisReview;
	beginSalaryAllocation?: DefaultConstructionCostRecord["beginSalaryAllocation"];
	sectionMapping?: ReturnType<typeof readSectionMappingSource>;
};

export function mapConstructionDiaryListRecord(
	rec: Record<string, any>,
): ConstructionDiaryListRow {
	const cost = rec.evalMetadata?.beginSalaryAllocation;
	const fimaBisRecords = readFimaBisRecordLinks(rec.evalMetadata, rec.BISId);
	const prodevBisReview = readProdevBisReview(rec.evalMetadata);
	return {
		...mapCommonDiaryListRecord(rec),
		...(prodevBisReview ? { prodevBisReview } : {}),
		sectionMapping: readSectionMappingSource(rec.evalMetadata),
		...(cost
			? {
					beginSalaryAllocation: {
						kind: cost.kind,
						currency: cost.currency,
						sourceReportId: cost.sourceReportId,
						planSha256: cost.planSha256,
						totalCents: cost.totalCents,
					},
				}
			: {}),
		fimaNumber: rec.fimaNumber ?? null,
		fimaBisRecords,
		hasFimaBisReferences: fimaBisRecords.length > 0,
		fimaCollaboration: rec.evalMetadata?.fimaCollaboration
			? readFimaCollaboration(rec.evalMetadata)
			: undefined,
	};
}
