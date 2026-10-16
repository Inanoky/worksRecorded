import type { Prisma } from "@prisma/client";

export const commonDiaryListSelect = {
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
} as const satisfies Prisma.sitediaryrecordsSelect & Prisma.ZtcRecordsSelect;

export function mapCommonDiaryListRecord(rec: Record<string, any>) {
	let createdBy = "";
	if (rec.User) {
		createdBy = [rec.User.firstName, rec.User.lastName]
			.filter(Boolean)
			.join(" ");
	} else if (rec.Worker) {
		createdBy = [rec.Worker.name, rec.Worker.surname].filter(Boolean).join(" ");
	}
	if (!createdBy) {
		createdBy =
			rec.originalUserComment
				?.trim()
				.match(/^(.+?)\s+:\s+/)?.[1]
				?.trim() ?? "";
	}
	return {
		id: rec.id,
		createdAt: rec.createdAt,
		Date: rec.Date,
		Date_Custom_1: rec.Date_Custom_1,
		Date_Custom_2: rec.Date_Custom_2,
		Location: rec.Location || "",
		Location_Custom_1: rec.Location_Custom_1 || "",
		Location_Custom_2: rec.Location_Custom_2 || "",
		Works: rec.Works || "",
		Works_Custom_1: rec.Works_Custom_1 || "",
		Works_Custom_2: rec.Works_Custom_2 || "",
		Comments: rec.Comments || "",
		Comments_Custom_1: rec.Comments_Custom_1 || "",
		Comments_Custom_2: rec.Comments_Custom_2 || "",
		Units: rec.Units || "",
		Amounts: rec.Amounts?.toString() || "",
		WorkersInvolved: rec.WorkersInvolved?.toString() || "",
		TimeInvolved: rec.TimeInvolved?.toString() || "",
		pausedAt: "pausedAt" in rec ? rec.pausedAt || null : null,
		pauseIntervals: "pauseIntervals" in rec ? (rec.pauseIntervals ?? []) : [],
		Photos: rec.Photos ?? [],
		BISId: rec.BISId || null,
		bisStatus: rec.bisStatus || null,
		originalUserComment: rec.originalUserComment || "",
		originalAudioUrl: rec.originalAudioUrl || "",
		createdBy: createdBy || "N/A",
	};
}
