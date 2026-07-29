import "dotenv/config";

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { type Prisma, PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const DEFAULT_SITE_ID = "45a7fe8e-3cda-49b0-9038-c098aa3ca6e1";
const DEFAULT_WORKBOOK =
	"g:/My Drive/worksRecorded/companies/SIA 1212/15062026 M101_izpildito darbu akts Nr.16 (1) (1) (1).xlsx";
const DEFAULT_SHEET = "1-1";
const MAX_WORK_OPTION_LENGTH = 200;
const OUTPUT_DIRECTORY = path.join(process.cwd(), ".site-diary-migrations");
const DEFAULT_CONSTRUCTION_FLOW = "default-construction";
const PRODUCTIVITY_SETTINGS_KEY = "defaultConstructionProductivity";

type Mode = "prepare" | "apply" | "verify" | "rollback";

type EstimateProductivity = {
	code: string;
	category: string;
	work: string;
	name: string;
	unit: string;
	laborNormHoursPerUnit: number;
	hourlyCost: number;
	sourceRow: number;
};

type ProductivitySetting = {
	work: string;
	unit: string;
	laborNormHoursPerUnit: number | null;
	hourlyCost: number | null;
};

type ProductivityArtifact = {
	version: 1;
	generatedAt: string;
	siteId: string;
	siteName: string;
	workbookPath: string;
	workbookSha256: string;
	sheetName: string;
	flowModuleKey: typeof DEFAULT_CONSTRUCTION_FLOW;
	estimateWorks: EstimateProductivity[];
	configuredWorks: string[];
	settings: ProductivitySetting[];
	addedUnits: string[];
	previousConfig: Prisma.JsonValue;
	previousConfigHash: string;
	nextConfig: Prisma.JsonValue;
	nextConfigHash: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown) {
	return String(value ?? "")
		.replace(/\s+/gu, " ")
		.replace(/\s+:/gu, ":")
		.trim();
}

function parseNumber(value: unknown) {
	const normalized = String(value ?? "")
		.replace(/,/gu, "")
		.replace(/[^0-9.-]/gu, "");
	if (!normalized) return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
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

function extractEstimateProductivity(workbookPath: string, sheetName: string) {
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
	const works: EstimateProductivity[] = [];
	let category: string | null = null;

	for (let index = 0; index < rows.length; index += 1) {
		const row = rows[index];
		const code = normalizeText(row?.[0]);
		const description = normalizeText(row?.[1]);
		if (/^\d+$/u.test(code) && description) {
			category = description;
			continue;
		}
		if (!/^\d+(?:\.\d+)+$/u.test(code) || !description) continue;
		if (!category) {
			throw new Error(`Estimate row ${index + 1} has no category`);
		}
		const unit = normalizeText(row?.[3]);
		const laborNormHoursPerUnit = parseNumber(row?.[5]);
		const hourlyCost = parseNumber(row?.[6]);
		if (!unit) throw new Error(`Estimate row ${index + 1} has no unit`);
		if (laborNormHoursPerUnit == null || laborNormHoursPerUnit <= 0) {
			throw new Error(`Estimate row ${index + 1} has an invalid time norm`);
		}
		if (hourlyCost == null || hourlyCost < 0) {
			throw new Error(`Estimate row ${index + 1} has an invalid hourly rate`);
		}
		works.push({
			code,
			category,
			work: description,
			name: makeWorkName(code, category, description),
			unit,
			laborNormHoursPerUnit,
			hourlyCost,
			sourceRow: index + 1,
		});
	}

	if (works.length === 0) throw new Error("No estimate works were extracted");
	if (new Set(works.map((work) => work.name)).size !== works.length) {
		throw new Error("Extracted Darbi names are not unique");
	}
	return works;
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

function readDropdownValues(config: Record<string, unknown>, field: string) {
	const fieldConfig = config[field];
	if (!isRecord(fieldConfig) || !isRecord(fieldConfig.DropDownOptions)) {
		throw new Error(`The site configuration has no valid ${field} options`);
	}
	return Object.values(fieldConfig.DropDownOptions)
		.map(normalizeText)
		.filter(Boolean);
}

function readExistingSettings(config: Record<string, unknown>) {
	const otherSettings = config.otherSettings;
	if (!isRecord(otherSettings)) return new Map<string, ProductivitySetting>();
	const productivity = otherSettings[PRODUCTIVITY_SETTINGS_KEY];
	if (!isRecord(productivity) || !Array.isArray(productivity.works)) {
		return new Map<string, ProductivitySetting>();
	}
	return new Map(
		productivity.works.filter(isRecord).map((row) => {
			const work = normalizeText(row.work);
			return [
				work.toLocaleLowerCase("lv"),
				{
					work,
					unit: normalizeText(row.unit),
					laborNormHoursPerUnit: parseNumber(row.laborNormHoursPerUnit),
					hourlyCost: parseNumber(row.hourlyCost),
				},
			] as const;
		}),
	);
}

function unique(values: string[]) {
	return [...new Set(values)];
}

function buildNextConfig(
	current: Record<string, unknown>,
	estimateWorks: EstimateProductivity[],
) {
	const next = structuredClone(current);
	const configuredWorks = readDropdownValues(next, "Works");
	const estimateByName = new Map(
		estimateWorks.map((work) => [work.name, work]),
	);
	const missingWorks = estimateWorks.filter(
		(work) => !configuredWorks.includes(work.name),
	);
	if (missingWorks.length > 0) {
		throw new Error(
			`${missingWorks.length} estimate works are missing from configured Darbi options`,
		);
	}
	const unexpectedNumberedWorks = configuredWorks.filter(
		(work) => /^\d+(?:\.\d+)+\s/u.test(work) && !estimateByName.has(work),
	);
	if (unexpectedNumberedWorks.length > 0) {
		throw new Error(
			`${unexpectedNumberedWorks.length} numbered Darbi options do not match the estimate`,
		);
	}

	const existingSettings = readExistingSettings(next);
	const settings = configuredWorks.map((work) => {
		const estimate = estimateByName.get(work);
		if (estimate) {
			return {
				work,
				unit: estimate.unit,
				laborNormHoursPerUnit: estimate.laborNormHoursPerUnit,
				hourlyCost: estimate.hourlyCost,
			};
		}
		const existing = existingSettings.get(work.toLocaleLowerCase("lv"));
		return {
			work,
			unit: existing?.unit ?? "",
			laborNormHoursPerUnit: existing?.laborNormHoursPerUnit ?? null,
			hourlyCost: existing?.hourlyCost ?? null,
		};
	});

	const existingUnits = readDropdownValues(next, "Units");
	const units = unique([
		...existingUnits,
		...estimateWorks.map((work) => work.unit),
	]);
	const unitsConfig = next.Units;
	if (!isRecord(unitsConfig)) {
		throw new Error("The site configuration has no valid Units field");
	}
	next.Units = {
		...unitsConfig,
		DropDownOptions: Object.fromEntries(units.map((unit) => [unit, unit])),
	};
	const otherSettings = isRecord(next.otherSettings) ? next.otherSettings : {};
	next.otherSettings = {
		...otherSettings,
		[PRODUCTIVITY_SETTINGS_KEY]: {
			version: 2,
			works: settings,
		},
	};

	return {
		next,
		configuredWorks,
		settings,
		addedUnits: units.filter((unit) => !existingUnits.includes(unit)),
	};
}

async function loadDefaultConstructionSite(siteId: string) {
	const site = await prisma.site.findUnique({
		where: { id: siteId },
		select: {
			id: true,
			name: true,
			organizationId: true,
			siteDiaryRecordsMap: true,
		},
	});
	if (!site) throw new Error(`Site ${siteId} was not found`);
	if (!isRecord(site.siteDiaryRecordsMap)) {
		throw new Error("The site has no valid diary configuration");
	}
	if (site.organizationId) {
		const assignment = await prisma.flowAssignment.findUnique({
			where: { organizationId: site.organizationId },
		});
		if (
			assignment?.enabled &&
			assignment.flowModuleKey !== DEFAULT_CONSTRUCTION_FLOW
		) {
			throw new Error(
				`Site uses ${assignment.flowModuleKey}, not ${DEFAULT_CONSTRUCTION_FLOW}`,
			);
		}
	}
	return site;
}

function artifactPath(siteId: string) {
	const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
	return path.join(
		OUTPUT_DIRECTORY,
		`${siteId}-${timestamp}-productivity.json`,
	);
}

function readArtifact(filePath: string) {
	return JSON.parse(fs.readFileSync(filePath, "utf8")) as ProductivityArtifact;
}

async function runPrepare(args: Record<string, string>) {
	const siteId = args["site-id"] ?? DEFAULT_SITE_ID;
	const workbookPath = args.workbook ?? DEFAULT_WORKBOOK;
	const sheetName = args.sheet ?? DEFAULT_SHEET;
	const estimateWorks = extractEstimateProductivity(workbookPath, sheetName);
	const site = await loadDefaultConstructionSite(siteId);
	const previousConfig = site.siteDiaryRecordsMap;
	const { next, configuredWorks, settings, addedUnits } = buildNextConfig(
		previousConfig as Record<string, unknown>,
		estimateWorks,
	);
	const artifact: ProductivityArtifact = {
		version: 1,
		generatedAt: new Date().toISOString(),
		siteId,
		siteName: site.name,
		workbookPath,
		workbookSha256: hashFile(workbookPath),
		sheetName,
		flowModuleKey: DEFAULT_CONSTRUCTION_FLOW,
		estimateWorks,
		configuredWorks,
		settings,
		addedUnits,
		previousConfig,
		previousConfigHash: hashJson(previousConfig),
		nextConfig: next as Prisma.JsonValue,
		nextConfigHash: hashJson(next),
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
				mode: "prepare",
				siteId,
				estimateWorks: estimateWorks.length,
				configuredWorks: configuredWorks.length,
				addedUnits,
				zeroHourlyRates: estimateWorks
					.filter((work) => work.hourlyCost === 0)
					.map((work) => work.code),
				artifactPath: outputPath,
			},
			null,
			2,
		),
	);
}

async function runApply(args: Record<string, string>) {
	if (!args.artifact) throw new Error("--artifact is required for apply mode");
	const artifactPath = path.resolve(args.artifact);
	const artifact = readArtifact(artifactPath);
	await loadDefaultConstructionSite(artifact.siteId);
	await prisma.$transaction(async (transaction) => {
		const site = await transaction.site.findUnique({
			where: { id: artifact.siteId },
			select: { siteDiaryRecordsMap: true },
		});
		if (!site) throw new Error(`Site ${artifact.siteId} was not found`);
		if (hashJson(site.siteDiaryRecordsMap) !== artifact.previousConfigHash) {
			throw new Error("The site diary configuration changed after preparation");
		}
		await transaction.site.update({
			where: { id: artifact.siteId },
			data: {
				siteDiaryRecordsMap: artifact.nextConfig as Prisma.InputJsonValue,
			},
		});
	});
	console.log(
		JSON.stringify(
			{
				mode: "apply",
				siteId: artifact.siteId,
				populatedWorks: artifact.estimateWorks.length,
				artifactPath,
			},
			null,
			2,
		),
	);
}

async function runVerify(args: Record<string, string>) {
	if (!args.artifact) throw new Error("--artifact is required for verify mode");
	const artifact = readArtifact(path.resolve(args.artifact));
	const site = await loadDefaultConstructionSite(artifact.siteId);
	if (hashJson(site.siteDiaryRecordsMap) !== artifact.nextConfigHash) {
		throw new Error("The live configuration does not match the artifact");
	}
	const current = site.siteDiaryRecordsMap as Record<string, unknown>;
	const currentSettings = readExistingSettings(current);
	const mismatches = artifact.estimateWorks.filter((estimate) => {
		const setting = currentSettings.get(estimate.name.toLocaleLowerCase("lv"));
		return (
			!setting ||
			setting.unit !== estimate.unit ||
			setting.laborNormHoursPerUnit !== estimate.laborNormHoursPerUnit ||
			setting.hourlyCost !== estimate.hourlyCost
		);
	});
	if (mismatches.length > 0) {
		throw new Error(`${mismatches.length} productivity settings do not match`);
	}
	console.log(
		JSON.stringify(
			{
				mode: "verify",
				siteId: artifact.siteId,
				verifiedEstimateWorks: artifact.estimateWorks.length,
				configuredWorks: artifact.configuredWorks.length,
				mismatches: 0,
			},
			null,
			2,
		),
	);
}

async function runRollback(args: Record<string, string>) {
	if (!args.artifact)
		throw new Error("--artifact is required for rollback mode");
	const artifactPath = path.resolve(args.artifact);
	const artifact = readArtifact(artifactPath);
	await prisma.$transaction(async (transaction) => {
		const site = await transaction.site.findUnique({
			where: { id: artifact.siteId },
			select: { siteDiaryRecordsMap: true },
		});
		if (!site) throw new Error(`Site ${artifact.siteId} was not found`);
		if (hashJson(site.siteDiaryRecordsMap) !== artifact.nextConfigHash) {
			throw new Error("The site diary configuration changed after application");
		}
		await transaction.site.update({
			where: { id: artifact.siteId },
			data: {
				siteDiaryRecordsMap: artifact.previousConfig as Prisma.InputJsonValue,
			},
		});
	});
	console.log(
		JSON.stringify(
			{
				mode: "rollback",
				siteId: artifact.siteId,
				artifactPath,
			},
			null,
			2,
		),
	);
}

async function main() {
	const args = parseArguments();
	const mode = (args.mode ?? "prepare") as Mode;
	if (mode === "prepare") return runPrepare(args);
	if (mode === "apply") return runApply(args);
	if (mode === "verify") return runVerify(args);
	if (mode === "rollback") return runRollback(args);
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
