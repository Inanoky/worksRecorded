jest.mock("@/lib/utils/db", () => ({
	prisma: { site: { findFirst: jest.fn() }, $transaction: jest.fn() },
}));

import { prisma } from "@/lib/utils/db";
import {
	BEGIN_ORGANIZATION_ID,
	BEGIN_STORAGE_MARKER,
	type BeginDay,
	parseBeginDay,
} from "./begin-hours";
import { persistBeginHours } from "./begin-hours-server";

it.each(["legacy-comment", "allocation", "begin-allocation"] as const)(
	"preserves %s explanations through reimports and in the previous revision without editing business records",
	async (source) => {
		const day: BeginDay = {
			kind: BEGIN_STORAGE_MARKER,
			version: 1,
			date: "2026-09-25",
			importedAt: "2026-09-28T07:00:00Z",
			importedBy: "test",
			sourceCompany: "Test",
			capturedOn: "2026-09-28",
			rateCents: 1250,
			objects: ["Site"],
			entries: [],
			history: [],
			allocations: [
				{
					recordId: "record",
					explanation: "Allocation explanation",
					hours: 6,
					workers: 2,
					source,
					savedAt: "2026-09-28T08:00:00Z",
					sourceImportedAt: "2026-09-28T07:00:00Z",
				},
			],
		};
		const tx = {
			$executeRaw: jest.fn().mockResolvedValue(1),
			site: {
				findUniqueOrThrow: jest
					.fn()
					.mockResolvedValue({ siteDiaryRecordsMap: {} }),
			},
			sitediaryrecords: {
				findFirst: jest.fn().mockResolvedValue(null),
				findMany: jest.fn().mockResolvedValue([
					{
						id: "storage",
						siteId: "site",
						Comments_Custom_2: JSON.stringify(day),
					},
				]),
				update: jest.fn().mockResolvedValue({}),
				create: jest.fn(),
			},
		};
		jest
			.mocked(prisma.site.findFirst)
			.mockResolvedValue({ id: "site" } as never);
		jest
			.mocked(prisma.$transaction)
			.mockImplementation(async (callback) =>
				(callback as unknown as (value: typeof tx) => Promise<unknown>)(tx),
			);
		const args = {
			siteId: "site",
			importedBy: "test",
			objects: ["Site"],
			snapshot: JSON.stringify({
				source: "https://app.begin.ee/en/new-timesheets",
				targetOrganizationId: BEGIN_ORGANIZATION_ID,
				company: "Test",
				from: "2026-09-25",
				through: "2026-09-25",
				capturedOn: "2026-09-29",
				workers: ["Worker"],
				objects: ["Site"],
				columns: [
					"workerIndex",
					"date",
					"start",
					"end",
					"durationMinutes",
					"objectIndex",
					"status",
					"comment",
				],
				rows: [[0, "25.09.2026", "08:00", "16:00", 480, 0, "approved", ""]],
			}),
		};
		const preview = await persistBeginHours(args);
		expect(tx.sitediaryrecords.update).not.toHaveBeenCalled();
		await persistBeginHours({ ...args, expectedRevision: preview.revision });
		expect(tx.sitediaryrecords.update).toHaveBeenCalledTimes(1);
		const update = tx.sitediaryrecords.update.mock.calls[0][0];
		expect(update.where).toEqual({ id: "storage" });
		const saved = parseBeginDay(update.data.Comments_Custom_2);
		expect(saved.allocations).toEqual(day.allocations);
		expect(saved.history[0].allocations).toEqual(day.allocations);
		expect(saved.importedAt).not.toBe(day.importedAt);
		expect(tx.sitediaryrecords.create).not.toHaveBeenCalled();
	},
);
