import type { Prisma } from "@prisma/client";
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
	hasFimaBisReferences?: boolean;
	fimaCollaboration?: FimaCollaboration;
};

export function mapConstructionDiaryListRecord(
	rec: Record<string, any>,
): ConstructionDiaryListRow {
	return {
		...mapCommonDiaryListRecord(rec),
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
