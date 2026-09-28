import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
	BEGIN_ORGANIZATION_ID,
	BEGIN_STORAGE_MARKER,
	parseBeginDay,
	splitLegacyBeginHoursComment,
	withBeginAllocation,
} from "../lib/begin-hours";

const db = new PrismaClient();
const apply = process.argv.includes("--apply");
const dateKey = (date: Date) =>
	new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Riga" }).format(date);

async function main() {
	const records = await db.sitediaryrecords.findMany({
		where: { organizationId: BEGIN_ORGANIZATION_ID, archivedAt: null },
		orderBy: { id: "asc" },
	});
	const stored = await db.sitediaryrecords.findMany({
		where: {
			organizationId: BEGIN_ORGANIZATION_ID,
			archivedAt: { not: null },
			archiveReason: BEGIN_STORAGE_MARKER,
		},
		select: { id: true, siteId: true, Comments_Custom_2: true },
	});
	const days = stored.map((record) => ({
		...record,
		day: parseBeginDay(record.Comments_Custom_2),
	}));
	const changes = records.flatMap((record) => {
		const split = splitLegacyBeginHoursComment(record.Comments);
		if (!split) return [];
		assert(
			record.siteId && record.Date,
			`Record ${record.id} has no site/date`,
		);
		const targets = days.filter(
			(item) =>
				item.siteId === record.siteId &&
				item.day.date === dateKey(record.Date as Date),
		);
		assert.equal(
			targets.length,
			1,
			`Expected one storage day for ${record.id}`,
		);
		assert(
			!targets[0].day.allocations?.some((item) => item.recordId === record.id),
			`Explanation already exists for ${record.id}; review manually`,
		);
		return [{ record, split, storageId: targets[0].id }];
	});
	console.log(
		JSON.stringify(
			{
				mode: apply ? "apply" : "preview",
				scanned: records.length,
				changes: changes.map(({ record, split, storageId }) => ({
					id: record.id,
					siteId: record.siteId,
					date: record.Date,
					storageId,
					comment: split.comment,
					explanation: split.explanation,
				})),
			},
			null,
			2,
		),
	);
	if (!apply || !changes.length) return;
	const backupDir = resolve(".site-diary-migrations");
	mkdirSync(backupDir, { recursive: true });
	const backup = resolve(
		backupDir,
		`limeni-hours-comments-${new Date().toISOString().replace(/[:.]/g, "-")}-before.json`,
	);
	writeFileSync(
		backup,
		JSON.stringify(
			{
				organizationId: BEGIN_ORGANIZATION_ID,
				records,
				storage: stored.filter((item) =>
					changes.some((change) => change.storageId === item.id),
				),
			},
			null,
			2,
		),
		{ flag: "wx" },
	);
	const savedAt = new Date().toISOString();
	await db.$transaction(
		async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${BEGIN_ORGANIZATION_ID}))`;
			for (const source of days.filter((item) =>
				changes.some((change) => change.storageId === item.id),
			)) {
				const current = await tx.sitediaryrecords.findFirstOrThrow({
					where: {
						id: source.id,
						organizationId: BEGIN_ORGANIZATION_ID,
						siteId: source.siteId,
						archiveReason: BEGIN_STORAGE_MARKER,
						archivedAt: { not: null },
					},
				});
				assert.equal(
					current.Comments_Custom_2,
					source.Comments_Custom_2,
					"Begin data changed since preview",
				);
				let day = source.day;
				for (const change of changes.filter(
					(item) => item.storageId === source.id,
				)) {
					day = withBeginAllocation(day, {
						recordId: change.record.id,
						explanation: change.split.explanation,
						hours: change.record.TimeInvolved,
						workers: change.record.WorkersInvolved,
						savedAt,
						sourceImportedAt: source.day.importedAt,
						source: "legacy-comment",
					});
					const result = await tx.sitediaryrecords.updateMany({
						where: {
							id: change.record.id,
							organizationId: BEGIN_ORGANIZATION_ID,
							siteId: change.record.siteId,
							Date: change.record.Date,
							archivedAt: null,
							Comments: change.record.Comments,
							TimeInvolved: change.record.TimeInvolved,
							WorkersInvolved: change.record.WorkersInvolved,
						},
						data: { Comments: change.split.comment || null },
					});
					assert.equal(
						result.count,
						1,
						`Record ${change.record.id} changed since preview`,
					);
				}
				const payload = JSON.stringify({
					...JSON.parse(current.Comments_Custom_2 as string),
					allocations: day.allocations,
				});
				parseBeginDay(payload);
				assert(payload.length <= 1_000_000, "Day storage exceeds size limit");
				const result = await tx.sitediaryrecords.updateMany({
					where: {
						id: source.id,
						organizationId: BEGIN_ORGANIZATION_ID,
						Comments_Custom_2: source.Comments_Custom_2,
					},
					data: { Comments_Custom_2: payload },
				});
				assert.equal(result.count, 1, "Begin storage changed during migration");
			}
		},
		{ timeout: 30000 },
	);
	const after = await db.sitediaryrecords.findMany({
		where: {
			id: { in: changes.map((change) => change.record.id) },
			organizationId: BEGIN_ORGANIZATION_ID,
		},
	});
	for (const change of changes) {
		assert.deepEqual(
			after.find((record) => record.id === change.record.id),
			{ ...change.record, Comments: change.split.comment || null },
		);
	}
	for (const source of days.filter((item) =>
		changes.some((change) => change.storageId === item.id),
	)) {
		const current = await db.sitediaryrecords.findUniqueOrThrow({
			where: { id: source.id },
		});
		const day = parseBeginDay(current.Comments_Custom_2);
		for (const change of changes.filter(
			(item) => item.storageId === source.id,
		)) {
			assert.equal(
				day.allocations?.find((item) => item.recordId === change.record.id)
					?.explanation,
				change.split.explanation,
			);
		}
		const { allocations: beforeAllocations, ...beforeData } = JSON.parse(
			source.Comments_Custom_2 as string,
		);
		const { allocations: afterAllocations, ...afterData } = JSON.parse(
			current.Comments_Custom_2 as string,
		);
		assert.deepEqual(afterData, beforeData);
		assert.equal(
			afterAllocations.length,
			(beforeAllocations?.length ?? 0) +
				changes.filter((item) => item.storageId === source.id).length,
		);
	}
	console.log(
		JSON.stringify({
			moved: changes.length,
			storageDays: new Set(changes.map((item) => item.storageId)).size,
			verified: true,
			backup,
		}),
	);
}

main()
	.catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	})
	.finally(() => db.$disconnect());
