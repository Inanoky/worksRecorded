import type { Prisma } from "@prisma/client";

export const diaryEditSelect = {
	id: true,
	createdAt: true,
	Date: true,
	Date_Custom_1: true,
	Date_Custom_2: true,
	Location: true,
	Location_Custom_1: true,
	Location_Custom_2: true,
	Works: true,
	Works_Custom_1: true,
	Works_Custom_2: true,
	Comments: true,
	Comments_Custom_1: true,
	Comments_Custom_2: true,
	Units: true,
	Amounts: true,
	WorkersInvolved: true,
	TimeInvolved: true,
	Photos: true,
	BISId: true,
	bisStatus: true,
	originalUserComment: true,
	originalAudioUrl: true,
	User: { select: { firstName: true, lastName: true } },
	Worker: { select: { name: true, surname: true } },
} satisfies Prisma.sitediaryrecordsSelect;

export function diaryEditRow(
	record: Prisma.sitediaryrecordsGetPayload<{ select: typeof diaryEditSelect }>,
) {
	const { User, Worker, ...row } = record;
	const creator = User
		? [User.firstName, User.lastName]
		: Worker
			? [Worker.name, Worker.surname]
			: [];
	return {
		...row,
		Location: record.Location ?? "",
		Location_Custom_1: record.Location_Custom_1 ?? "",
		Location_Custom_2: record.Location_Custom_2 ?? "",
		Works: record.Works ?? "",
		Works_Custom_1: record.Works_Custom_1 ?? "",
		Works_Custom_2: record.Works_Custom_2 ?? "",
		Comments: record.Comments ?? "",
		Comments_Custom_1: record.Comments_Custom_1 ?? "",
		Comments_Custom_2: record.Comments_Custom_2 ?? "",
		Units: record.Units ?? "",
		originalUserComment: record.originalUserComment ?? "",
		originalAudioUrl: record.originalAudioUrl ?? "",
		Date: record.Date?.toISOString() ?? "",
		createdAt: record.createdAt.toISOString(),
		Date_Custom_1: record.Date_Custom_1?.toISOString() ?? "",
		Date_Custom_2: record.Date_Custom_2?.toISOString() ?? "",
		Amounts: record.Amounts?.toString() ?? "",
		WorkersInvolved: record.WorkersInvolved?.toString() ?? "",
		TimeInvolved: record.TimeInvolved?.toString() ?? "",
		createdBy:
			creator.filter(Boolean).join(" ") ||
			record.originalUserComment
				?.trim()
				.match(/^(.+?)\s+:\s+/)?.[1]
				?.trim() ||
			"N/A",
	};
}

export type DiaryEditChanges = {
	rows: ReturnType<typeof diaryEditRow>[];
	createdIds: string[];
	deletedIds?: string[];
};

export function mergeDiaryEditChanges<T extends { id?: string | null }>(
	current: T[],
	changes: DiaryEditChanges,
): T[] {
	const saved = new Map(changes.rows.map((row) => [row.id, row]));
	const deleted = new Set(changes.deletedIds);
	const existing = new Set(current.map((row) => row.id));
	return [
		...current
			.filter((row) => !row.id || !deleted.has(row.id))
			.map((row) =>
				saved.has(row.id ?? "") ? { ...row, ...saved.get(row.id ?? "") } : row,
			),
		...changes.rows
			.filter((row) => !existing.has(row.id) && !deleted.has(row.id))
			.map((row) => row as unknown as T),
	];
}
