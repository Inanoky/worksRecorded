import type { ConstructionDiaryListRow } from "@/flows/default-construction/backend/diary-list-record";
import type { buildDefaultConstructionDiaryConfig } from "@/flows/default-construction/lib/diary-config";

export type FimaProjectDiary = {
	siteId: string;
	config: ReturnType<typeof buildDefaultConstructionDiaryConfig>;
	page: {
		rows: ConstructionDiaryListRow[];
		page: number;
		pageSize: number;
		totalCount: number;
		totalPages: number;
	};
};
