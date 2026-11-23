import { strict as assert } from "node:assert";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import "dotenv/config";
import pg from "pg";

const projectRef = "wfsvrqtzsaqngbrbatfp";
const targetOrg = "4a606c0d-d165-4c4e-b8b1-948198415234";
const forma2Key = "defaultConstructionForma2";
const mappings = [
	{
		source: "18b7b5a5-12f8-4aca-ac13-9a88b72b9d3b",
		sourceOrg: "ae0f30d1-921d-4f4c-8f89-624f94a27e64",
		sourceName: "Testa projekts Ocelt",
		target: "c5e3f9f2-e0c7-4f68-b1d3-2cc9f2b9406e",
		targetName: "Ocelt",
		expected: {
			active: 31,
			archived: 6,
			positions: 52,
			links: 17,
			incompleteAudits: 0,
		},
	},
	{
		source: "c520a9d4-43c6-44ac-8a92-cbdda9d9354c",
		sourceOrg: "73bfa5f9-9e49-460e-876e-8d9eb58ba2cb",
		sourceName: "HUS K",
		target: "58e3d84c-a9bf-41f7-8f8a-2fdc030b95d4",
		targetName: "SBSTOMME",
		expected: {
			active: 73,
			archived: 0,
			positions: 21,
			links: 20,
			incompleteAudits: 0,
		},
	},
	{
		source: "134913dd-7392-44b0-8f3c-41a0a3334790",
		sourceOrg: "2ba9305a-4cd0-421c-945f-4d99454fb145",
		sourceName: "81-317_2026_Waterfront_Kuzu_Group",
		target: "aea23633-0e25-4a2d-894f-6130d56401cc",
		targetName: "StoneAndTree",
		expected: {
			active: 49,
			archived: 12,
			positions: 0,
			links: 0,
			incompleteAudits: 3,
		},
	},
];

const tables = {
	diary: "sitediaryrecords",
	batches: "SiteDiarySaveBatch",
	audits: "SiteDiaryCorrectionAudit",
	guidance: "ConstructionDiaryFeedback",
	guidanceVersions: "ConstructionDiaryFeedbackVersion",
};
const diaryFields = [
	"Date",
	"Date_Custom_1",
	"Date_Custom_2",
	"Location",
	"Location_Custom_1",
	"Location_Custom_2",
	"Works",
	"Works_Custom_1",
	"Works_Custom_2",
	"Comments",
	"Comments_Custom_1",
	"Comments_Custom_2",
	"originalUserComment",
	"Units",
	"Amounts",
	"WorkersInvolved",
	"TimeInvolved",
	"createdAt",
	"archivedAt",
	"archiveReason",
];
const diarySettings = [
	"defaultConstructionProductivity",
	"defaultConstructionForma2WorkSync",
	"defaultConstructionWorkAliases",
	"defaultConstructionDiaryProjectRules",
	"defaultConstructionQuantityPlanActual",
];

function canonical(value) {
	if (Array.isArray(value)) return value.map(canonical);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(
		Object.keys(value)
			.sort()
			.map((key) => [key, canonical(value[key])]),
	);
}

const fingerprint = (value) =>
	createHash("sha256")
		.update(JSON.stringify(canonical(value)))
		.digest("hex");

function copyId(seed, scope, id) {
	const hex = fingerprint([seed, scope, id]);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function requireLink(ids, id, label) {
	const copy = ids.get(id);
	assert(copy, `Unresolved ${label}`);
	return copy;
}

function pick(row, fields) {
	return Object.fromEntries(fields.map((field) => [field, row[field]]));
}

function sorted(rows) {
	return [...rows].sort((a, b) =>
		(a.id ?? a.domain) < (b.id ?? b.domain) ? -1 : 1,
	);
}

async function snapshot(db, siteId) {
	const { rows } = await db.query(
		`SELECT
			to_jsonb(s) AS site,
			EXISTS(SELECT 1 FROM public."User" u WHERE u.id=s."userId" AND u."organizationId"=s."organizationId") AS "ownerInOrg",
			(SELECT to_jsonb(t) FROM public.sitediarysettings t WHERE t."siteId"=s.id) AS settings,
			(SELECT to_jsonb(a) FROM public.analytics a WHERE a."siteId"=s.id) AS analytics,
			(SELECT count(*)::int FROM public."BISmaterialRecords" m WHERE m."siteId"=s.id) AS "warehouseCount",
			(SELECT count(*)::int FROM public.photos p WHERE p."siteId"=s.id) AS "photoCount",
			(SELECT count(*)::int FROM public."SiteDiaryCorrectionSession" c WHERE c."siteId"=s.id) AS "sessionCount",
			${Object.entries(tables)
				.map(([key, table]) => {
					const guidance = key.startsWith("guidance");
					return `COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public."${table}" t WHERE t."siteId"=s.id${guidance ? " AND t.domain='diary'" : ""}), '[]'::jsonb) AS "${key}"`;
				})
				.join(",\n")}
		FROM public."Site" s WHERE s.id=$1`,
		[siteId],
	);
	assert.equal(rows.length, 1, `Site not found: ${siteId}`);
	const result = rows[0];
	for (const key of Object.keys(tables)) result[key] = sorted(result[key]);
	return result;
}

function rewriteCatalogRefs(value, ids) {
	if (typeof value === "string") return ids.get(value) ?? value;
	if (Array.isArray(value))
		return value.map((item) => rewriteCatalogRefs(item, ids));
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(
		Object.entries(value).map(([key, item]) => [
			ids.get(key) ?? key,
			rewriteCatalogRefs(item, ids),
		]),
	);
}

function assertDestinationEmpty(target) {
	for (const key of Object.keys(tables))
		assert.equal(target[key].length, 0, `Destination has ${key}`);
	for (const key of ["warehouseCount", "photoCount", "sessionCount"])
		assert.equal(target[key], 0, `Destination has ${key}`);
	assert(
		!target.site.bisCaseId && !target.site.bisCaseNumber,
		"Destination has a BIS case",
	);
	assert(
		target.analytics?.currentWeekProgress?.[forma2Key] == null,
		"Destination has Forma2 data",
	);
	assert(
		target.settings && !target.settings.fileUrl,
		"Destination diary settings require review",
	);
}

function buildCopy(mapping, source, target, seed) {
	assert.equal(source.site.organizationId, mapping.sourceOrg);
	assert.equal(source.site.name, mapping.sourceName);
	assert.equal(target.site.organizationId, targetOrg);
	assert.equal(target.site.name, mapping.targetName);
	assert(
		target.ownerInOrg && target.site.userId,
		"Destination owner must belong to MyOrg",
	);
	assertDestinationEmpty(target);
	assert(source.settings?.schema, "Source diary schema is missing");

	const newId = (scope, id) => copyId(seed, `${mapping.target}:${scope}`, id);
	const ownership = {
		siteId: mapping.target,
		userId: target.site.userId,
		organizationId: targetOrg,
	};
	const actor = { siteId: ownership.siteId, userId: ownership.userId };
	const recordIds = new Map(
		source.diary.map((row) => [row.id, newId("diary", row.id)]),
	);
	const batchIds = new Map(
		source.batches.map((row) => [row.id, newId("batch", row.id)]),
	);
	const messageId = (id) =>
		id == null ? null : `diary-copy:${newId("message", id)}`;
	const incompleteAudits = source.audits.filter(
		(row) =>
			!batchIds.has(row.oldBatchId) ||
			!batchIds.has(row.newBatchId) ||
			[...row.oldRecordIds, ...row.newRecordIds].some(
				(id) => !recordIds.has(id),
			),
	);
	const omittedMessages = new Set(
		incompleteAudits.map((row) => row.correctionMessageId),
	);
	const audits = source.audits
		.filter((row) => !omittedMessages.has(row.correctionMessageId))
		.map((row) => ({
			...actor,
			id: newId("audit", row.id),
			oldBatchId: requireLink(batchIds, row.oldBatchId, "old audit batch"),
			newBatchId: requireLink(batchIds, row.newBatchId, "new audit batch"),
			correctionMessageId: messageId(row.correctionMessageId),
			correctionText: row.correctionText,
			oldRecordIds: row.oldRecordIds.map((id) =>
				requireLink(recordIds, id, "old audit row"),
			),
			newRecordIds: row.newRecordIds.map((id) =>
				requireLink(recordIds, id, "new audit row"),
			),
			createdAt: row.createdAt,
		}));
	const batches = source.batches.map((row) => ({
		...actor,
		...pick(row, ["originalText", "status", "createdAt", "archivedAt"]),
		id: requireLink(batchIds, row.id, "batch ID"),
		sourceMessageId: messageId(row.sourceMessageId),
		replacementBatchId:
			row.replacementBatchId == null
				? null
				: requireLink(batchIds, row.replacementBatchId, "replacement batch"),
	}));
	const diary = source.diary.map((row) => {
		const { diaryQuality, manualQuantitySplit, ...unknown } =
			row.evalMetadata ?? {};
		assert.deepEqual(
			Object.keys(unknown),
			[],
			"Review unrecognized diary metadata before copying",
		);
		const evalMetadata = {};
		if (diaryQuality) {
			evalMetadata.diaryQuality = {
				...pick(diaryQuality, ["status", "reason"]),
				sourceMessageId: messageId(diaryQuality.sourceMessageId),
			};
		}
		if (manualQuantitySplit) {
			evalMetadata.manualQuantitySplit = {
				...pick(manualQuantitySplit, [
					"endDate",
					"originalTotal",
					"performedAt",
					"source",
					"startDate",
				]),
				originalRecordId: requireLink(
					recordIds,
					manualQuantitySplit.originalRecordId,
					"original split record",
				),
				operationKey: newId("quantity-split", manualQuantitySplit.operationKey),
			};
		}
		return {
			...ownership,
			...pick(row, diaryFields),
			id: requireLink(recordIds, row.id, "diary ID"),
			saveBatchId:
				row.saveBatchId == null
					? null
					: requireLink(batchIds, row.saveBatchId, "diary batch"),
			archivedByMessageId: omittedMessages.has(row.archivedByMessageId)
				? null
				: messageId(row.archivedByMessageId),
			workerId: null,
			fimaNumber: null,
			BISId: null,
			bisStatus: null,
			originalAudioUrl: null,
			Photos: [],
			evalMetadata: Object.keys(evalMetadata).length ? evalMetadata : null,
		};
	});

	const sourceConfig = source.site.siteDiaryRecordsMap;
	assert(
		sourceConfig?.Works && sourceConfig.AIpromptToUse,
		"Source diary configuration is missing",
	);
	const { otherSettings, ...fields } = sourceConfig;
	const config = {
		...fields,
		otherSettings: { ...target.site.siteDiaryRecordsMap?.otherSettings },
	};
	for (const key of diarySettings) {
		delete config.otherSettings[key];
		if (Object.hasOwn(otherSettings ?? {}, key))
			config.otherSettings[key] = otherSettings[key];
	}
	let analytics = target.analytics;
	const state = source.analytics?.currentWeekProgress?.[forma2Key];
	const document = state?.document ?? null;
	const workAllocations =
		state?.allocations.filter((row) => row.sourceType === "work") ?? [];
	if (document) {
		const positionIds = new Map(
			document.positions.map((row) => [row.id, newId("position", row.id)]),
		);
		assert.equal(
			positionIds.size,
			document.positions.length,
			"Duplicate position ID",
		);
		const documentId = newId("document", document.id);
		const manifest = config.otherSettings.defaultConstructionForma2WorkSync;
		assert.equal(
			manifest?.documentId,
			document.id,
			"Source work dropdown is not bound to the source catalog",
		);
		for (const entry of manifest.entries)
			requireLink(positionIds, entry.positionId, "dropdown position");
		config.otherSettings = rewriteCatalogRefs(
			config.otherSettings,
			new Map([...positionIds, [document.id, documentId]]),
		);
		const forma2 = {
			version: 1,
			document: {
				...document,
				id: documentId,
				positions: document.positions.map((position) => ({
					...position,
					id: requireLink(positionIds, position.id, "position ID"),
					parentId:
						position.parentId == null
							? null
							: requireLink(positionIds, position.parentId, "parent position"),
				})),
			},
			allocations: workAllocations.map(({ ruleId, split, ...row }) => ({
				...row,
				sourceId: requireLink(
					recordIds,
					row.sourceId,
					"work allocation diary row",
				),
				positionId: requireLink(
					positionIds,
					row.positionId,
					"allocation position",
				),
				...(split
					? {
							split: {
								...split,
								parts: split.parts.map((part) => ({
									...part,
									positionId: requireLink(
										positionIds,
										part.positionId,
										"split position",
									),
								})),
							},
						}
					: {}),
			})),
			materialRules: [],
		};
		analytics = {
			...(target.analytics ?? {
				id: newId("analytics", source.analytics.id),
				siteId: mapping.target,
				lastWeekProgress: null,
				createdAt: source.analytics.createdAt,
			}),
			currentWeekProgress: {
				...target.analytics?.currentWeekProgress,
				[forma2Key]: forma2,
			},
		};
	}
	const summary = {
		active: diary.filter((row) => !row.archivedAt).length,
		archived: diary.filter((row) => row.archivedAt).length,
		positions: document?.positions.length ?? 0,
		links: workAllocations.length,
		incompleteAudits: incompleteAudits.length,
	};
	assert.deepEqual(
		summary,
		mapping.expected,
		`Source counts changed for ${mapping.sourceName}`,
	);
	const guidance = source.guidance.map((row) => ({
		...row,
		siteId: mapping.target,
		generationToken: null,
		leaseUntil: null,
	}));
	const guidanceVersions = source.guidanceVersions.map((row) => ({
		...row,
		id: newId("guidance-version", row.id),
		siteId: mapping.target,
		actorId: row.actorId == null ? null : actor.userId,
	}));

	return {
		summary,
		incompleteAudits,
		expected: {
			...target,
			site: { ...target.site, siteDiaryRecordsMap: config },
			settings: {
				...target.settings,
				schema: source.settings.schema,
				targets: source.settings.targets,
			},
			analytics,
			diary: sorted(diary),
			batches: sorted(batches),
			audits: sorted(audits),
			guidance: sorted(guidance),
			guidanceVersions: sorted(guidanceVersions),
		},
	};
}

function matchesCopy(actual, expected) {
	const { updatedAt: _time, ...site } = actual.site;
	const { updatedAt: _expectedTime, ...expectedSite } = expected.site;
	return (
		fingerprint({ ...actual, site }) ===
		fingerprint({ ...expected, site: expectedSite })
	);
}

async function insertRows(db, table, rows) {
	if (!rows.length) return;
	const columns = Object.keys(rows[0])
		.map((key) => `"${key.replaceAll('"', '""')}"`)
		.join(", ");
	const inserted = await db.query(
		`INSERT INTO public."${table}" (${columns})
		SELECT ${columns} FROM jsonb_populate_recordset(NULL::public."${table}", $1::jsonb)`,
		[JSON.stringify(rows)],
	);
	assert.equal(
		inserted.rowCount,
		rows.length,
		`Wrong insert count for ${table}`,
	);
}

async function writeCopy(db, copy, previous) {
	const { expected } = copy;
	const siteId = expected.site.id;
	const site = await db.query(
		`UPDATE public."Site" SET "siteDiaryRecordsMap"=$1::jsonb, "updatedAt"=CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
		WHERE id=$2 AND "organizationId"=$3`,
		[JSON.stringify(expected.site.siteDiaryRecordsMap), siteId, targetOrg],
	);
	assert.equal(site.rowCount, 1);
	const settings = await db.query(
		`UPDATE public.sitediarysettings SET schema=$1, targets=$2::jsonb WHERE id=$3 AND "siteId"=$4`,
		[
			expected.settings.schema,
			expected.settings.targets == null
				? null
				: JSON.stringify(expected.settings.targets),
			expected.settings.id,
			siteId,
		],
	);
	assert.equal(settings.rowCount, 1);
	for (const key of [
		"batches",
		"diary",
		"audits",
		"guidance",
		"guidanceVersions",
	]) {
		await insertRows(db, tables[key], expected[key]);
	}
	if (expected.analytics && !previous.analytics) {
		await insertRows(db, "analytics", [expected.analytics]);
	} else if (
		expected.analytics &&
		fingerprint(expected.analytics) !== fingerprint(previous.analytics)
	) {
		const analytics = await db.query(
			`UPDATE public.analytics SET "currentWeekProgress"=$1::jsonb WHERE "siteId"=$2`,
			[JSON.stringify(expected.analytics.currentWeekProgress), siteId],
		);
		assert.equal(analytics.rowCount, 1);
	}
}

async function connection() {
	const url = new URL(process.env.DIRECT_URL ?? "");
	assert(
		url.hostname === `db.${projectRef}.supabase.co` ||
			(url.hostname.endsWith(".pooler.supabase.com") &&
				url.username.endsWith(`.${projectRef}`)),
		"Expected the approved Supabase project in DIRECT_URL",
	);
	assert.equal(url.pathname, "/postgres");
	const caFile = process.env.MYORG_COPY_DB_CA_FILE;
	const ca = caFile ? await readFile(caFile, "utf8") : undefined;
	return new pg.Client({
		connectionString: url.toString(),
		ssl: { ca, rejectUnauthorized: true },
		connectionTimeoutMillis: 8000,
		statement_timeout: 15000,
	});
}

async function readPairs(db) {
	const pairs = [];
	for (const mapping of mappings) {
		pairs.push({
			source: await snapshot(db, mapping.source),
			target: await snapshot(db, mapping.target),
		});
	}
	return pairs;
}

function previewCopies(backup) {
	return mappings.map((mapping, index) => {
		const { source, target } = backup.pairs[index];
		return buildCopy(mapping, source, target, backup.seed);
	});
}

function report(mode, copies) {
	return {
		mode,
		projects: copies.map(({ expected, summary, incompleteAudits }, index) => ({
			sourceId: mappings[index].source,
			sourceName: mappings[index].sourceName,
			targetId: expected.site.id,
			targetName: expected.site.name,
			...summary,
			batches: expected.batches.length,
			audits: expected.audits.length,
			guidanceRevision: expected.guidance[0]?.revision ?? null,
			omittedAuditCount: incompleteAudits.length,
			warehouseCount: expected.warehouseCount,
		})),
	};
}

async function run(db, args) {
	if (args.length === 0) {
		await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
		const backup = {
			version: 1,
			seed: randomUUID(),
			pairs: await readPairs(db),
		};
		const copies = previewCopies(backup);
		await db.query("COMMIT");
		const directory = await mkdtemp(path.join(tmpdir(), "myorg-diary-copy-"));
		const file = path.join(directory, "preview-and-backup.json");
		await writeFile(
			file,
			JSON.stringify(
				{
					...backup,
					fingerprint: fingerprint(backup),
					incompleteAudits: copies.map((copy) => copy.incompleteAudits),
				},
				null,
				2,
			),
			{ flag: "wx", mode: 0o600 },
		);
		console.log(
			JSON.stringify({ ...report("preview", copies), backup: file }, null, 2),
		);
		return;
	}
	const [mode, file] = args;
	assert(
		args.length === 2 && ["--apply", "--verify"].includes(mode) && file,
		"Use no arguments for preview, or --apply/--verify <preview-and-backup.json>",
	);
	const saved = JSON.parse(await readFile(file, "utf8"));
	const backup = pick(saved, ["version", "seed", "pairs"]);
	assert.equal(backup.version, 1);
	assert.equal(
		saved.fingerprint,
		fingerprint(backup),
		"Preview fingerprint mismatch",
	);
	const copies = previewCopies(backup);
	await db.query(
		mode === "--apply"
			? "BEGIN ISOLATION LEVEL SERIALIZABLE"
			: "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
	);
	if (mode === "--apply") {
		await db.query("SET LOCAL lock_timeout = '5s'");
		await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
			"myorg-diary-copy-20261121",
		]);
		await db.query(
			'SELECT id FROM public."Site" WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',
			[mappings.map((mapping) => mapping.target)],
		);
	}
	const current = await readPairs(db);
	for (const [index, pair] of current.entries()) {
		assert.equal(
			fingerprint(pair.source),
			fingerprint(backup.pairs[index].source),
			`Source changed after preview: ${mappings[index].sourceName}`,
		);
	}
	if (
		copies.every((copy, index) =>
			matchesCopy(current[index].target, copy.expected),
		)
	) {
		await db.query("COMMIT");
		console.log(
			JSON.stringify(
				report(mode === "--apply" ? "already-copied" : "verified", copies),
				null,
				2,
			),
		);
		return;
	}
	assert.equal(mode, "--apply", "Destination verification failed");
	for (const [index, pair] of current.entries()) {
		assert.equal(
			fingerprint(pair.target),
			fingerprint(backup.pairs[index].target),
			`Destination changed after preview: ${mappings[index].targetName}`,
		);
	}
	for (const [index, copy] of copies.entries())
		await writeCopy(db, copy, current[index].target);
	const copied = await readPairs(db);
	for (const [index, pair] of copied.entries()) {
		assert(
			matchesCopy(pair.target, copies[index].expected),
			`Copied data mismatch: ${mappings[index].targetName}`,
		);
		assert.equal(
			fingerprint(pair.source),
			fingerprint(current[index].source),
			"Source changed during copy",
		);
	}
	await db.query("COMMIT");
	console.log(JSON.stringify(report("applied", copies), null, 2));
}

const db = await connection();
try {
	await db.connect();
	await run(db, process.argv.slice(2));
} catch (error) {
	await db.query("ROLLBACK").catch(() => {});
	console.error(
		error instanceof assert.AssertionError
			? error.message
			: `Copy failed: ${error.code ?? error.name}`,
	);
	process.exitCode = 1;
} finally {
	await db.end().catch(() => {});
}
