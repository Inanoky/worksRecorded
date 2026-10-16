import type { Prisma } from "@prisma/client";
import {
	commonDiaryListSelect,
	mapCommonDiaryListRecord,
} from "@/lib/site-diary/list-record";

export const ztcDiaryListSelect = {
	...commonDiaryListSelect,
	pausedAt: true,
	pauseIntervals: true,
} as const satisfies Prisma.ZtcRecordsSelect;

export function mapZtcDiaryListRecord(rec: Record<string, any>) {
	return mapCommonDiaryListRecord(rec);
}
