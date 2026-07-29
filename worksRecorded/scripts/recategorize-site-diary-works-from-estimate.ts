import "dotenv/config";

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import * as XLSX from "xlsx";
import { z } from "zod";

const DEFAULT_SITE_ID = "45a7fe8e-3cda-49b0-9038-c098aa3ca6e1";
const DEFAULT_WORKBOOK =
	"g:/My Drive/worksRecorded/companies/SIA 1212/15062026 M101_izpildito darbu akts Nr.16 (1) (1) (1).xlsx";
const DEFAULT_SHEET = "1-1";
const DEFAULT_MODEL = "gpt-5.6-terra";
const DEFAULT_BATCH_SIZE = 15;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.75;
const MAX_WORK_OPTION_LENGTH = 200;
const OUTPUT_DIRECTORY = path.join(process.cwd(), ".site-diary-migrations");
const OPERATIONAL_WORKS = [
	"Piezīmes",
	"Kavējums",
	"Inspekcija",
	"Papildu darbi",
	"Materiālu piegāde",
	"Iekārtu piegāde",
] as const;

type Mode =
	| "dry-run"
	| "approve-review"
	| "prepare-numbering"
	| "apply"
	| "verify"
	| "rollback";

type EstimateWork = {
	code: string;
	category: string;
	work: string;
	name: string;
	sourceRow: number;
};

type ActiveDiaryRecord = {
	id: string;
	Date: Date | null;
	Location: string | null;
	Works: string | null;
	Comments: string | null;
	originalUserComment: string | null;
	Units: string | null;
	Amounts: number | null;
	WorkersInvolved: number | null;
	TimeInvolved: number | null;
	archivedAt: Date | null;
	BISId: string | null;
};

type WorkMapping = {
	id: string;
	oldWorks: string | null;
	newWorks: string;
	confidence: number;
	reason: string;
};

type ClassifiedResult = {
	id: string;
	works: string;
	confidence: number;
	reason: string;
};

type MigrationArtifact = {
	version: 1;
	generatedAt: string;
	siteId: string;
	siteName: string;
	workbookPath: string;
	workbookSha256: string;
	sheetName: string;
	model: string;
	confidenceThreshold: number;
	readyToApply: boolean;
	catalog: EstimateWork[];
	operationalWorks: string[];
	allowedWorks: string[];
	snapshot: {
		siteDiaryRecordsMap: Prisma.JsonValue | null;
		siteDiaryRecordsMapHash: string;
		recordsHash: string;
		records: Array<{ id: string; oldWorks: string | null }>;
	};
	mappings: WorkMapping[];
	summary: {
		recordCount: number;
		lowConfidenceCount: number;
		before: Record<string, number>;
		after: Record<string, number>;
	};
	review?: {
		reviewedAt: string;
		reviewFile: string;
		reviewedMappingCount: number;
	};
};

const prisma = new PrismaClient();

function parseArguments() {
	const parsed: Record<string, string> = {};
	const tokens = process.argv.slice(2);
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (!token.startsWith("--")) continue;
		const separatorIndex = token.indexOf("=");
		if (separatorIndex >= 0) {
			parsed[token.slice(2, separatorIndex)] = token.slice(separatorIndex + 1);
			continue;
		}
		const key = token.slice(2);
		const next = tokens[index + 1];
		if (next && !next.startsWith("--")) {
			parsed[key] = next;
			index += 1;
		} else {
			parsed[key] = "true";
		}
	}
	return parsed;
}

function normalizeText(value: unknown) {
	return String(value ?? "")
		.replace(/\s+/gu, " ")
		.replace(/\s+:/gu, ":")
		.trim();
}

function makeWorkName(code: string, category: string, work: string) {
	let name = `${normalizeText(code)} ${normalizeText(category)} - ${normalizeText(work)}`;
	if (name.length > MAX_WORK_OPTION_LENGTH) {
		name = name.replace("Knauf sistēmai W112", "Knauf W112");
	}
	if (name.length > MAX_WORK_OPTION_LENGTH) {
		throw new Error(
			`Generated Darbi option exceeds ${MAX_WORK_OPTION_LENGTH} characters: ${name}`,
		);
	}
	return name;
}

function extractEstimateWorks(workbookPath: string, sheetName: string) {
	const workbook = XLSX.readFile(workbookPath);
	const worksheet = workbook.Sheets[sheetName];
	if (!worksheet) {
		throw new Error(
			`Sheet ${sheetName} was not found. Available sheets: ${workbook.SheetNames.join(", ")}`,
		);
	}

	const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
		header: 1,
		defval: null,
		raw: false,
	});
	const catalog: EstimateWork[] = [];
	let category: string | null = null;

	for (let index = 0; index < rows.length; index += 1) {
		const code = normalizeText(rows[index]?.[0]);
		const description = normalizeText(rows[index]?.[1]);
		if (
			/^\d+$/u.test(code) &&
			description &&
			description.toLowerCase() !== "kopā"
		) {
			category = description;
			continue;
		}
		if (!/^\d+(?:\.\d+)+$/u.test(code) || !description) continue;
		if (!category) {
			throw new Error(
				`Numbered estimate row ${index + 1} has no category header`,
			);
		}
		catalog.push({
			code,
			category,
			work: description,
			name: makeWorkName(code, category, description),
			sourceRow: index + 1,
		});
	}

	const duplicateNames = catalog
		.map((item) => item.name)
		.filter((name, index, names) => names.indexOf(name) !== index);
	if (duplicateNames.length > 0) {
		throw new Error(
			`Duplicate generated Darbi options: ${[...new Set(duplicateNames)].join(", ")}`,
		);
	}
	if (catalog.length === 0) {
		throw new Error(
			`No numbered estimate works were found in sheet ${sheetName}`,
		);
	}
	return catalog;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stableValue);
	if (!isRecord(value)) return value;
	return Object.fromEntries(
		Object.keys(value)
			.sort()
			.map((key) => [key, stableValue(value[key])]),
	);
}

function hashJson(value: unknown) {
	return createHash("sha256")
		.update(JSON.stringify(stableValue(value)))
		.digest("hex");
}

function hashFile(filePath: string) {
	return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function countValues(values: Array<string | null>) {
	return Object.fromEntries(
		[
			...values.reduce((counts, value) => {
				const key = value ?? "<null>";
				counts.set(key, (counts.get(key) ?? 0) + 1);
				return counts;
			}, new Map<string, number>()),
		].sort((left, right) => right[1] - left[1]),
	);
}

function recordsSnapshot(records: ActiveDiaryRecord[]) {
	return records
		.map((record) => ({ id: record.id, oldWorks: record.Works }))
		.sort((left, right) => left.id.localeCompare(right.id));
}

function buildNextSiteDiaryRecordsMap(
	current: Prisma.JsonValue | null,
	allowedWorks: string[],
) {
	if (!isRecord(current)) {
		throw new Error("The site has no valid siteDiaryRecordsMap configuration");
	}
	const next = structuredClone(current) as Record<string, unknown>;
	if (!isRecord(next.Works)) {
		throw new Error("The site configuration has no Works field");
	}
	next.Works = {
		...next.Works,
		DropDownOptions: Object.fromEntries(
			allowedWorks.map((work) => [work, work]),
		),
	};
	return next as Prisma.InputJsonValue;
}

function chunk<T>(items: T[], size: number) {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
}

function sanitizeCategorizationText(value: string | null) {
	if (!value) return null;
	return value
		.replace(/^[^:\r\n]{1,100}\s*:\s*/u, "")
		.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gu, "[email removed]")
		.replace(/\+\d[\d\s()-]{7,}\d/gu, "[phone removed]")
		.trim();
}

async function classifyBatch(args: {
	openai: OpenAI;
	model: string;
	allowedWorks: string[];
	estimateWorks: EstimateWork[];
	records: ActiveDiaryRecord[];
}) {
	const allowedEnum = z.enum(args.allowedWorks as [string, ...string[]]);
	const responseSchema = z.object({
		results: z.array(
			z.object({
				id: z.string(),
				works: allowedEnum,
				confidence: z.number().min(0).max(1),
				reason: z.string().max(240),
			}),
		),
	});
	const privateKeys = new Map(
		args.records.map((record, index) => [`record-${index + 1}`, record.id]),
	);
	const expectedIds = new Set(privateKeys.keys());
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= 3; attempt += 1) {
		try {
			const response = await args.openai.responses.parse(
				{
					model: args.model,
					reasoning: { effort: "medium" },
					store: false,
					max_output_tokens: 7000,
					instructions: [
						"You recategorize Latvian construction site-diary records into an authoritative fixed Darbi catalogue extracted from a project estimate.",
						"Return exactly one result for every supplied record ID and never create or rewrite a category.",
						"Prefer the most specific estimate work that matches the complete record meaning. Treat currentWorks only as a weak hint.",
						"Use Piezīmes for weather, general notes, or records without completed construction work; Kavējums for delays; Inspekcija for inspections; Materiālu piegāde and Iekārtu piegāde for deliveries; Papildu darbi only for real construction work not represented by an estimate item.",
						"Do not infer a specific estimate item from isolated keywords when the complete comment conflicts.",
						"Confidence means confidence that the exact selected Darbi option is the best category for the complete record.",
					].join(" "),
					input: JSON.stringify({
						allowedWorks: args.allowedWorks,
						estimateReference: args.estimateWorks.map((item) => ({
							code: item.code,
							category: item.category,
							work: item.work,
							allowedName: item.name,
						})),
						records: args.records.map((record, index) => ({
							id: `record-${index + 1}`,
							location: record.Location,
							currentWorks: record.Works,
							comments: sanitizeCategorizationText(record.Comments),
							originalUserComment: sanitizeCategorizationText(
								record.originalUserComment,
							),
							units: record.Units,
							amounts: record.Amounts,
							workers: record.WorkersInvolved,
							hours: record.TimeInvolved,
						})),
					}),
					text: {
						format: zodTextFormat(
							responseSchema,
							"site_diary_works_recategorization",
						),
					},
				},
				{ timeout: 180_000 },
			);
			const parsed = response.output_parsed;
			if (!parsed) throw new Error("The model returned no parsed output");
			const resultIds = parsed.results.map((result) => result.id);
			const duplicates = resultIds.filter(
				(id, index) => resultIds.indexOf(id) !== index,
			);
			const missing = [...expectedIds].filter((id) => !resultIds.includes(id));
			const unexpected = resultIds.filter((id) => !expectedIds.has(id));
			if (duplicates.length || missing.length || unexpected.length) {
				throw new Error(
					`Invalid model ID coverage: duplicates=${duplicates.length}, missing=${missing.length}, unexpected=${unexpected.length}`,
				);
			}
			return (parsed.results as ClassifiedResult[]).map((result) => ({
				...result,
				id: privateKeys.get(result.id) ?? result.id,
			}));
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			console.error(
				`Classification attempt ${attempt} failed: ${lastError.message}`,
			);
		}
	}
	throw lastError ?? new Error("Classification failed");
}

async function loadSiteAndActiveRecords(siteId: string) {
	const site = await prisma.site.findUnique({
		where: { id: siteId },
		select: { id: true, name: true, siteDiaryRecordsMap: true },
	});
	if (!site) throw new Error(`Site ${siteId} was not found`);
	const records = await prisma.sitediaryrecords.findMany({
		where: { siteId, archivedAt: null },
		select: {
			id: true,
			Date: true,
			Location: true,
			Works: true,
			Comments: true,
			originalUserComment: true,
			Units: true,
			Amounts: true,
			WorkersInvolved: true,
			TimeInvolved: true,
			archivedAt: true,
			BISId: true,
		},
		orderBy: { id: "asc" },
	});
	return { site, records };
}

function artifactPath(siteId: string) {
	const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
	return path.join(OUTPUT_DIRECTORY, `${siteId}-${timestamp}.json`);
}

function readArtifact(filePath: string) {
	return JSON.parse(fs.readFileSync(filePath, "utf8")) as MigrationArtifact;
}

function approvedArtifactPath(filePath: string) {
	const extension = path.extname(filePath);
	return `${filePath.slice(0, -extension.length)}-approved${extension}`;
}

function numberedArtifactPath(filePath: string) {
	const extension = path.extname(filePath);
	return `${filePath.slice(0, -extension.length)}-numbered${extension}`;
}

function configuredWorks(current: Prisma.JsonValue | null) {
	if (!isRecord(current) || !isRecord(current.Works)) {
		throw new Error("The site configuration has no valid Works field");
	}
	const options = current.Works.DropDownOptions;
	if (!isRecord(options)) {
		throw new Error("The Works field has no valid dropdown options");
	}
	return Object.keys(options);
}

async function runPrepareNumbering(args: Record<string, string>) {
	if (!args.artifact)
		throw new Error("--artifact is required for prepare-numbering mode");
	const artifactFile = path.resolve(args.artifact);
	const source = readArtifact(artifactFile);
	if (!source.readyToApply) {
		throw new Error("The source artifact is not approved");
	}
	const numberedCatalog = source.catalog.map((item) => ({
		...item,
		name: makeWorkName(item.code, item.category, item.work),
	}));
	const replacements = new Map(
		source.catalog.map((item, index) => [
			item.name,
			numberedCatalog[index].name,
		]),
	);
	if ([...replacements].some(([before, after]) => before === after)) {
		throw new Error(
			"The source artifact already contains numbered Darbi names",
		);
	}
	const allowedWorks = [
		...numberedCatalog.map((item) => item.name),
		...source.operationalWorks,
	];
	if (new Set(allowedWorks).size !== allowedWorks.length) {
		throw new Error("Numbered Darbi names are not unique");
	}

	const { site, records } = await loadSiteAndActiveRecords(source.siteId);
	const currentOptions = configuredWorks(site.siteDiaryRecordsMap);
	const expectedOptions = new Set(source.allowedWorks);
	const missingOptions = source.allowedWorks.filter(
		(option) => !currentOptions.includes(option),
	);
	const unexpectedOptions = currentOptions.filter(
		(option) => !expectedOptions.has(option),
	);
	if (missingOptions.length || unexpectedOptions.length) {
		throw new Error(
			`Current Darbi options do not match the applied artifact: missing=${missingOptions.length}, unexpected=${unexpectedOptions.length}`,
		);
	}
	const appliedById = new Map(
		source.mappings.map((mapping) => [mapping.id, mapping.newWorks]),
	);
	if (records.length !== source.mappings.length) {
		throw new Error("The active record count changed after recategorization");
	}
	for (const record of records) {
		if (appliedById.get(record.id) !== record.Works) {
			throw new Error(
				`Record ${record.id} no longer matches the applied recategorization`,
			);
		}
	}

	const mappings = records.map((record) => ({
		id: record.id,
		oldWorks: record.Works,
		newWorks:
			(record.Works && replacements.get(record.Works)) ??
			record.Works ??
			(() => {
				throw new Error(`Record ${record.id} has no Darbi value`);
			})(),
		confidence: 1,
		reason: "Deterministically added the estimate row code to the Darbi name.",
	}));
	const snapshotRecords = recordsSnapshot(records);
	const numberedArtifact: MigrationArtifact = {
		...source,
		generatedAt: new Date().toISOString(),
		siteName: site.name,
		model: "deterministic-no-llm",
		readyToApply: true,
		catalog: numberedCatalog,
		allowedWorks,
		snapshot: {
			siteDiaryRecordsMap: site.siteDiaryRecordsMap,
			siteDiaryRecordsMapHash: hashJson(site.siteDiaryRecordsMap),
			recordsHash: hashJson(snapshotRecords),
			records: snapshotRecords,
		},
		mappings,
		summary: {
			recordCount: records.length,
			lowConfidenceCount: 0,
			before: countValues(records.map((record) => record.Works)),
			after: countValues(mappings.map((mapping) => mapping.newWorks)),
		},
	};
	await validateArtifactAgainstCurrentState(numberedArtifact);
	const outputPath = numberedArtifactPath(artifactFile);
	fs.writeFileSync(
		outputPath,
		`${JSON.stringify(numberedArtifact, null, 2)}\n`,
		"utf8",
	);
	console.log(
		JSON.stringify(
			{
				mode: "prepare-numbering",
				siteId: source.siteId,
				numberedEstimateWorks: numberedCatalog.length,
				records: records.length,
				changedRecords: mappings.filter(
					(mapping) => mapping.oldWorks !== mapping.newWorks,
				).length,
				artifactPath: outputPath,
			},
			null,
			2,
		),
	);
}

async function runDryRun(args: Record<string, string>) {
	const siteId = args["site-id"] ?? DEFAULT_SITE_ID;
	const workbookPath = args.workbook ?? DEFAULT_WORKBOOK;
	const sheetName = args.sheet ?? DEFAULT_SHEET;
	const model =
		args.model ??
		process.env.SITE_DIARY_RECATEGORIZATION_MODEL ??
		DEFAULT_MODEL;
	const batchSize = Number(args["batch-size"] ?? DEFAULT_BATCH_SIZE);
	const confidenceThreshold = Number(
		args["confidence-threshold"] ?? DEFAULT_CONFIDENCE_THRESHOLD,
	);
	if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
	if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 30) {
		throw new Error("batch-size must be an integer between 1 and 30");
	}
	if (confidenceThreshold < 0 || confidenceThreshold > 1) {
		throw new Error("confidence-threshold must be between 0 and 1");
	}

	const catalog = extractEstimateWorks(workbookPath, sheetName);
	const allowedWorks = [
		...catalog.map((item) => item.name),
		...OPERATIONAL_WORKS,
	];
	const { site, records } = await loadSiteAndActiveRecords(siteId);
	const bisLinked = records.filter((record) => record.BISId);
	if (bisLinked.length > 0) {
		throw new Error(
			`Refusing to recategorize ${bisLinked.length} BIS-linked records`,
		);
	}
	if (records.length === 0)
		throw new Error("No active site-diary records were found");

	const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	const batches = chunk(records, batchSize);
	const classified: ClassifiedResult[] = [];
	for (let index = 0; index < batches.length; index += 1) {
		console.log(
			`Classifying batch ${index + 1}/${batches.length} (${batches[index].length} records)`,
		);
		classified.push(
			...(await classifyBatch({
				openai,
				model,
				allowedWorks,
				estimateWorks: catalog,
				records: batches[index],
			})),
		);
	}

	const recordsById = new Map(records.map((record) => [record.id, record]));
	const mappings = classified
		.map((result) => {
			const record = recordsById.get(result.id);
			if (!record)
				throw new Error(`Model returned unknown record ${result.id}`);
			return {
				id: result.id,
				oldWorks: record.Works,
				newWorks: result.works,
				confidence: result.confidence,
				reason: result.reason,
			} satisfies WorkMapping;
		})
		.sort((left, right) => left.id.localeCompare(right.id));
	const lowConfidence = mappings.filter(
		(mapping) => mapping.confidence < confidenceThreshold,
	);
	const snapshotRecords = recordsSnapshot(records);
	const artifact: MigrationArtifact = {
		version: 1,
		generatedAt: new Date().toISOString(),
		siteId,
		siteName: site.name,
		workbookPath,
		workbookSha256: hashFile(workbookPath),
		sheetName,
		model,
		confidenceThreshold,
		readyToApply: lowConfidence.length === 0,
		catalog,
		operationalWorks: [...OPERATIONAL_WORKS],
		allowedWorks,
		snapshot: {
			siteDiaryRecordsMap: site.siteDiaryRecordsMap,
			siteDiaryRecordsMapHash: hashJson(site.siteDiaryRecordsMap),
			recordsHash: hashJson(snapshotRecords),
			records: snapshotRecords,
		},
		mappings,
		summary: {
			recordCount: records.length,
			lowConfidenceCount: lowConfidence.length,
			before: countValues(records.map((record) => record.Works)),
			after: countValues(mappings.map((mapping) => mapping.newWorks)),
		},
	};

	fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
	const outputPath = artifactPath(siteId);
	fs.writeFileSync(
		outputPath,
		`${JSON.stringify(artifact, null, 2)}\n`,
		"utf8",
	);
	console.log(
		JSON.stringify(
			{
				mode: "dry-run",
				siteId,
				siteName: site.name,
				estimateWorks: catalog.length,
				allowedWorks: allowedWorks.length,
				records: records.length,
				lowConfidence: lowConfidence.length,
				readyToApply: artifact.readyToApply,
				after: artifact.summary.after,
				lowConfidenceMappings: lowConfidence,
				artifactPath: outputPath,
			},
			null,
			2,
		),
	);
}

async function validateArtifactAgainstCurrentState(
	artifact: MigrationArtifact,
) {
	const { site, records } = await loadSiteAndActiveRecords(artifact.siteId);
	const currentSnapshot = recordsSnapshot(records);
	if (
		hashJson(site.siteDiaryRecordsMap) !==
		artifact.snapshot.siteDiaryRecordsMapHash
	) {
		throw new Error("The site diary configuration changed after the dry run");
	}
	if (hashJson(currentSnapshot) !== artifact.snapshot.recordsHash) {
		throw new Error(
			"The active record set or current Darbi values changed after the dry run",
		);
	}
	if (artifact.mappings.length !== records.length) {
		throw new Error(
			"The artifact does not contain exactly one mapping per active record",
		);
	}
	const allowed = new Set(artifact.allowedWorks);
	const invalid = artifact.mappings.filter(
		(mapping) => !allowed.has(mapping.newWorks),
	);
	if (invalid.length > 0) {
		throw new Error(
			`${invalid.length} artifact mappings use invalid Darbi values`,
		);
	}
	return { site, records };
}

async function runApproveReview(args: Record<string, string>) {
	if (!args.artifact)
		throw new Error("--artifact is required for approve-review mode");
	if (!args.review)
		throw new Error("--review is required for approve-review mode");
	const artifactFile = path.resolve(args.artifact);
	const reviewFile = path.resolve(args.review);
	const artifact = readArtifact(artifactFile);
	const review = JSON.parse(fs.readFileSync(reviewFile, "utf8")) as {
		reviews?: Array<{ id: string; approvedWorks: string; note: string }>;
	};
	if (!Array.isArray(review.reviews)) {
		throw new Error("Review file must contain a reviews array");
	}
	const lowConfidence = artifact.mappings.filter(
		(mapping) => mapping.confidence < artifact.confidenceThreshold,
	);
	const lowIds = new Set(lowConfidence.map((mapping) => mapping.id));
	const reviewIds = review.reviews.map((item) => item.id);
	const duplicateReviewIds = reviewIds.filter(
		(id, index) => reviewIds.indexOf(id) !== index,
	);
	const missing = [...lowIds].filter((id) => !reviewIds.includes(id));
	const unexpected = reviewIds.filter((id) => !lowIds.has(id));
	if (duplicateReviewIds.length || missing.length || unexpected.length) {
		throw new Error(
			`Invalid review coverage: duplicates=${duplicateReviewIds.length}, missing=${missing.length}, unexpected=${unexpected.length}`,
		);
	}
	const allowed = new Set(artifact.allowedWorks);
	const reviewsById = new Map(review.reviews.map((item) => [item.id, item]));
	const mappings = artifact.mappings.map((mapping) => {
		const reviewed = reviewsById.get(mapping.id);
		if (!reviewed) return mapping;
		if (!allowed.has(reviewed.approvedWorks)) {
			throw new Error(`Review for ${mapping.id} uses an invalid Darbi value`);
		}
		if (!reviewed.note.trim()) {
			throw new Error(`Review for ${mapping.id} has no review note`);
		}
		return {
			...mapping,
			newWorks: reviewed.approvedWorks,
			reason: `${mapping.reason} Manual review: ${reviewed.note.trim()}`,
		};
	});
	const approved: MigrationArtifact = {
		...artifact,
		readyToApply: true,
		mappings,
		summary: {
			...artifact.summary,
			after: countValues(mappings.map((mapping) => mapping.newWorks)),
		},
		review: {
			reviewedAt: new Date().toISOString(),
			reviewFile,
			reviewedMappingCount: review.reviews.length,
		},
	};
	await validateArtifactAgainstCurrentState(approved);
	const outputPath = approvedArtifactPath(artifactFile);
	fs.writeFileSync(
		outputPath,
		`${JSON.stringify(approved, null, 2)}\n`,
		"utf8",
	);
	console.log(
		JSON.stringify(
			{
				mode: "approve-review",
				siteId: artifact.siteId,
				reviewedMappings: review.reviews.length,
				readyToApply: true,
				artifactPath: outputPath,
			},
			null,
			2,
		),
	);
}

async function runApply(args: Record<string, string>) {
	if (!args.artifact) throw new Error("--artifact is required for apply mode");
	const artifact = readArtifact(path.resolve(args.artifact));
	if (!artifact.readyToApply) {
		throw new Error(
			`Artifact has ${artifact.summary.lowConfidenceCount} low-confidence mappings and is not approved for apply`,
		);
	}
	const { site } = await validateArtifactAgainstCurrentState(artifact);
	const nextMap = buildNextSiteDiaryRecordsMap(
		site.siteDiaryRecordsMap,
		artifact.allowedWorks,
	);

	await prisma.$transaction(
		async (transaction) => {
			await transaction.site.update({
				where: { id: artifact.siteId },
				data: { siteDiaryRecordsMap: nextMap },
			});
			for (const mapping of artifact.mappings) {
				const result = await transaction.sitediaryrecords.updateMany({
					where: {
						id: mapping.id,
						siteId: artifact.siteId,
						archivedAt: null,
						Works: mapping.oldWorks,
					},
					data: { Works: mapping.newWorks },
				});
				if (result.count !== 1) {
					throw new Error(
						`Record ${mapping.id} changed before it could be updated`,
					);
				}
			}
		},
		{ timeout: 120_000 },
	);

	console.log(
		JSON.stringify(
			{
				mode: "apply",
				siteId: artifact.siteId,
				updatedRecords: artifact.mappings.length,
				configuredWorks: artifact.allowedWorks.length,
				artifactPath: path.resolve(args.artifact),
			},
			null,
			2,
		),
	);
}

async function runVerify(args: Record<string, string>) {
	if (!args.artifact) throw new Error("--artifact is required for verify mode");
	const artifact = readArtifact(path.resolve(args.artifact));
	const { site, records } = await loadSiteAndActiveRecords(artifact.siteId);
	const currentOptions = configuredWorks(site.siteDiaryRecordsMap);
	const expectedOptions = new Set(artifact.allowedWorks);
	const missingOptions = artifact.allowedWorks.filter(
		(option) => !currentOptions.includes(option),
	);
	const unexpectedOptions = currentOptions.filter(
		(option) => !expectedOptions.has(option),
	);
	const expectedById = new Map(
		artifact.mappings.map((mapping) => [mapping.id, mapping.newWorks]),
	);
	const mismatchedRecords = records.filter(
		(record) => expectedById.get(record.id) !== record.Works,
	);
	const missingRecords = artifact.mappings.filter(
		(mapping) => !records.some((record) => record.id === mapping.id),
	);
	const invalidWorkValues = records.filter(
		(record) => !record.Works || !expectedOptions.has(record.Works),
	);
	if (
		missingOptions.length ||
		unexpectedOptions.length ||
		mismatchedRecords.length ||
		missingRecords.length ||
		invalidWorkValues.length
	) {
		throw new Error(
			`Verification failed: missingOptions=${missingOptions.length}, unexpectedOptions=${unexpectedOptions.length}, mismatchedRecords=${mismatchedRecords.length}, missingRecords=${missingRecords.length}, invalidWorkValues=${invalidWorkValues.length}`,
		);
	}
	console.log(
		JSON.stringify(
			{
				mode: "verify",
				siteId: artifact.siteId,
				activeRecords: records.length,
				configuredWorks: currentOptions.length,
				estimateWorks: artifact.catalog.length,
				operationalWorks: artifact.operationalWorks.length,
				mismatchedRecords: 0,
				missingOptions: 0,
				unexpectedOptions: 0,
				invalidWorkValues: 0,
			},
			null,
			2,
		),
	);
}

async function runRollback(args: Record<string, string>) {
	if (!args.artifact)
		throw new Error("--artifact is required for rollback mode");
	const artifact = readArtifact(path.resolve(args.artifact));
	const { site, records } = await loadSiteAndActiveRecords(artifact.siteId);
	const currentById = new Map(records.map((record) => [record.id, record]));
	for (const mapping of artifact.mappings) {
		const current = currentById.get(mapping.id);
		if (!current || current.Works !== mapping.newWorks) {
			throw new Error(
				`Record ${mapping.id} no longer matches the applied migration`,
			);
		}
	}
	const currentMap = site.siteDiaryRecordsMap;
	if (!isRecord(currentMap) || !isRecord(currentMap.Works)) {
		throw new Error("The current site diary configuration is invalid");
	}

	await prisma.$transaction(
		async (transaction) => {
			await transaction.site.update({
				where: { id: artifact.siteId },
				data: {
					siteDiaryRecordsMap:
						artifact.snapshot.siteDiaryRecordsMap === null
							? Prisma.JsonNull
							: (artifact.snapshot
									.siteDiaryRecordsMap as Prisma.InputJsonValue),
				},
			});
			for (const mapping of artifact.mappings) {
				const result = await transaction.sitediaryrecords.updateMany({
					where: {
						id: mapping.id,
						siteId: artifact.siteId,
						archivedAt: null,
						Works: mapping.newWorks,
					},
					data: { Works: mapping.oldWorks },
				});
				if (result.count !== 1) {
					throw new Error(`Record ${mapping.id} changed before rollback`);
				}
			}
		},
		{ timeout: 120_000 },
	);

	console.log(
		JSON.stringify(
			{
				mode: "rollback",
				siteId: artifact.siteId,
				restoredRecords: artifact.mappings.length,
				artifactPath: path.resolve(args.artifact),
			},
			null,
			2,
		),
	);
}

async function main() {
	const args = parseArguments();
	const mode = (args.mode ?? "dry-run") as Mode;
	if (mode === "dry-run") {
		await runDryRun(args);
		return;
	}
	if (mode === "approve-review") {
		await runApproveReview(args);
		return;
	}
	if (mode === "prepare-numbering") {
		await runPrepareNumbering(args);
		return;
	}
	if (mode === "apply") {
		await runApply(args);
		return;
	}
	if (mode === "verify") {
		await runVerify(args);
		return;
	}
	if (mode === "rollback") {
		await runRollback(args);
		return;
	}
	throw new Error(`Unsupported mode: ${mode}`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
