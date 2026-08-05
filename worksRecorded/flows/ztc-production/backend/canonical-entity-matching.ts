import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import ztcSiteDiaryRecordsMap from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";
import {
	ZTC_OPENAI_MODEL,
	ZTC_OPENAI_REASONING_EFFORT,
} from "@/flows/ztc-production/backend/openai-config";
import {
	getZtcProjectIdentityKey,
	normalizeZtcProjectName,
	resolveZtcCanonicalProjectName,
} from "@/flows/ztc-production/lib/ztc-project-name";
import {
	isZtcComplexityCoefficientTask,
	ZTC_ALL_PROJECTS_RATE_NAME,
} from "@/flows/ztc-production/lib/ztc-rate-constants";
import {
	getZtcExcludedRateTaskKeys,
	normalizeZtcProjectRateExclusions,
	normalizeZtcRateTaskKey,
} from "@/flows/ztc-production/lib/ztc-rate-exclusions";
import type {
	ZtcDefaultTaskRate,
	ZtcRateCategory,
} from "@/flows/ztc-production/lib/ztc-rate-matching";
import {
	canonicalizeZtcMatchedWorkName,
	findZtcDefaultRateForTask,
	getZtcRateCrossSectionMatch,
	hasZtcRateCrossSection,
	normalizeZtcRateTaskName,
	ztcRateMatchTokens,
} from "@/flows/ztc-production/lib/ztc-rate-matching";
import { normalizeZtcRateUnit } from "@/flows/ztc-production/lib/ztc-rate-units";
import { prisma } from "@/lib/utils/db";

export const ZTC_CANONICAL_MATCH_MODEL = ZTC_OPENAI_MODEL;
export const ZTC_CANONICAL_MATCH_REASONING_EFFORT =
	ZTC_OPENAI_REASONING_EFFORT;

const ZTC_CANONICAL_MATCH_TIMEOUT_MS = 30_000;
const ZTC_CANONICAL_MATCH_CACHE_MS = 60 * 60 * 1000;
const ZTC_PROJECT_MATCH_CONFIDENCE = 0.8;
const ZTC_WORK_MATCH_CONFIDENCE = 0.8;

type ProjectCandidate = {
	id: string;
	name: string;
	manual: boolean;
	hasConfiguredRates: boolean;
	source: "configured" | "existing";
};

type WorkCandidate = {
	id: string;
	task: string;
	category: ZtcRateCategory;
	projectCandidateId: string | null;
	projectName: string | null;
	excludedProjectCandidateIds: string[];
	rate: ZtcDefaultTaskRate;
};

type CanonicalCatalog = {
	projects: ProjectCandidate[];
	works: WorkCandidate[];
};

const canonicalMatchSchema = z.object({
	projectCandidateId: z.string().nullable(),
	projectConfidence: z.number().min(0).max(1),
	workMatches: z.array(
		z.object({
			rawIndex: z.number().int().min(0),
			workCandidateId: z.string().nullable(),
			confidence: z.number().min(0).max(1),
		}),
	),
});

type CanonicalModelMatch = z.infer<typeof canonicalMatchSchema>;

export type ZtcCanonicalProjectMatch = {
	name: string;
	confidence: number;
	source: "exact" | "llm" | "raw";
};

export type ZtcCanonicalWorkMatch = {
	rawIndex: number;
	rawWork: string;
	task: string | null;
	canonicalWork: string;
	confidence: number;
	source: "exact" | "llm" | "raw";
	rate: ZtcDefaultTaskRate | null;
};

export type ZtcCanonicalEntityMatch = {
	project: ZtcCanonicalProjectMatch | null;
	works: ZtcCanonicalWorkMatch[];
	modelCalled: boolean;
};

type CachedCanonicalMatch = {
	expiresAt: number;
	value: ZtcCanonicalEntityMatch;
};

const canonicalMatchCache = new Map<string, CachedCanonicalMatch>();

function projectIdentity(value: unknown) {
	return getZtcProjectIdentityKey(value);
}

function projectTokens(value: unknown) {
	return normalizeZtcProjectName(value)
		.replace(/\s*\([^)]*\)\s*$/, "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.match(/[a-z0-9]+/g) ?? [];
}

function hasPlausibleProjectNameOverlap(left: unknown, right: unknown) {
	const leftTokens = projectTokens(left);
	const rightTokens = projectTokens(right);
	const shorterLength = Math.min(leftTokens.length, rightTokens.length);
	if (shorterLength < 2) return false;

	const rightTokenSet = new Set(rightTokens);
	const sharedTokens = new Set(
		leftTokens.filter((token) => rightTokenSet.has(token)),
	);
	return sharedTokens.size >= 2 && sharedTokens.size / shorterLength >= 0.5;
}

function taskIdentity(value: unknown) {
	return normalizeZtcRateTaskName(String(value ?? ""))
		.toLocaleLowerCase("lv")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "");
}

function drawingWorkCode(value: unknown) {
	const match = normalizeZtcRateTaskName(String(value ?? "")).match(
		/^((?:r[1-5]\/t[1-5])|(?:l[1-5](?:\/b[1-5])?)|tl|l0|(?:[a-z]{1,4}\d+(?:\/[a-z]{1,4}\d+)?))(?=\s*[-:/])/i,
	);
	return match?.[1]?.toLocaleLowerCase("lv") ?? "";
}

function parseRate(value: unknown, fallbackUnit: "m2" | "gab" | "st") {
	const raw =
		value && typeof value === "object"
			? (value as Record<string, unknown>)
			: null;
	const task = normalizeZtcRateTaskName(String(raw?.task ?? "")).trim();
	if (!task || isZtcComplexityCoefficientTask(task)) return null;
	const rateValue = String(raw?.rate ?? "")
		.trim()
		.replace(",", ".");
	return {
		task,
		rate: Number.isFinite(Number(rateValue)) ? rateValue : "",
		unit: normalizeZtcRateUnit(raw?.unit, fallbackUnit),
		laborNorm: raw?.laborNorm == null ? null : String(raw.laborNorm),
		relatesToElement: raw?.relatesToElement === true,
	} satisfies ZtcDefaultTaskRate;
}

function isParsedRate(
	value: ReturnType<typeof parseRate>,
): value is NonNullable<ReturnType<typeof parseRate>> {
	return Boolean(value);
}

function parseConfiguredProjects(config: unknown) {
	const root =
		config && typeof config === "object"
			? (config as Record<string, unknown>)
			: null;
	const settings =
		root?.otherSettings && typeof root.otherSettings === "object"
			? (root.otherSettings as Record<string, unknown>)
			: null;
	const rateRoot = settings?.ztcDefaultTaskRates;
	const projects =
		rateRoot && typeof rateRoot === "object" && !Array.isArray(rateRoot)
			? (rateRoot as Record<string, unknown>).projects
			: rateRoot;
	if (!Array.isArray(projects)) return [];

	return projects
		.map((value) => {
			const raw =
				value && typeof value === "object"
					? (value as Record<string, unknown>)
					: null;
			const projectName = String(raw?.projectName ?? "").trim();
			if (!projectName) return null;
			const works = Array.isArray(raw?.works)
				? raw.works.map((entry) => parseRate(entry, "m2")).filter(isParsedRate)
				: [];
			const additionalDetails = Array.isArray(raw?.additionalDetails)
				? raw.additionalDetails
						.map((entry) => parseRate(entry, "gab"))
						.filter(isParsedRate)
				: [];
			const additionalWorks = Array.isArray(raw?.additionalWorks)
				? raw.additionalWorks
						.map((entry) => parseRate(entry, "st"))
						.filter(isParsedRate)
				: [];
			return {
				projectName,
				manual: raw?.manual === true,
				excludedTasks: normalizeZtcProjectRateExclusions(raw?.excludedTasks),
				works,
				additionalDetails,
				additionalWorks,
			};
		})
		.filter((project): project is NonNullable<typeof project> =>
			Boolean(project),
		);
}

async function loadCanonicalCatalog(siteId: string, category: ZtcRateCategory) {
	const [site, existingRows] = await Promise.all([
		prisma.site.findUnique({
			where: { id: siteId },
			select: { siteDiaryRecordsMap: true },
		}),
		prisma.ztcRecords.findMany({
			where: { siteId, Location: { not: null } },
			select: { Location: true },
			orderBy: { createdAt: "asc" },
		}),
	]);
	const savedConfig =
		site?.siteDiaryRecordsMap && typeof site.siteDiaryRecordsMap === "object"
			? (site.siteDiaryRecordsMap as Record<string, unknown>)
			: null;
	const baseConfig = ztcSiteDiaryRecordsMap as Record<string, unknown>;
	const baseSettings =
		baseConfig.otherSettings && typeof baseConfig.otherSettings === "object"
			? (baseConfig.otherSettings as Record<string, unknown>)
			: {};
	const savedSettings =
		savedConfig?.otherSettings && typeof savedConfig.otherSettings === "object"
			? (savedConfig.otherSettings as Record<string, unknown>)
			: {};
	const mergedConfig = {
		...baseConfig,
		...(savedConfig ?? {}),
		otherSettings: { ...baseSettings, ...savedSettings },
	};
	const configuredProjects = parseConfiguredProjects(mergedConfig);
	const projects: ProjectCandidate[] = [];
	const projectIds = new Map<string, string>();

	for (const configured of configuredProjects) {
		if (
			normalizeZtcProjectName(configured.projectName) ===
			normalizeZtcProjectName(ZTC_ALL_PROJECTS_RATE_NAME)
		) {
			continue;
		}
		const key = projectIdentity(configured.projectName);
		if (!key || projectIds.has(key)) continue;
		const id = `project_${projects.length}`;
		projectIds.set(key, id);
		projects.push({
			id,
			name: configured.projectName,
			manual: configured.manual,
			hasConfiguredRates:
				configured.works.length > 0 ||
				configured.additionalDetails.length > 0 ||
				configured.additionalWorks.length > 0,
			source: "configured",
		});
	}

	for (const row of existingRows) {
		const name = String(row.Location ?? "").trim();
		const key = projectIdentity(name);
		if (
			!key ||
			normalizeZtcProjectName(name) === "papilddarbi" ||
			projectIds.has(key)
		)
			continue;
		const id = `project_${projects.length}`;
		projectIds.set(key, id);
		projects.push({
			id,
			name,
			manual: false,
			hasConfiguredRates: false,
			source: "existing",
		});
	}

	const works: WorkCandidate[] = [];
	const seenWorks = new Set<string>();
	for (const configured of configuredProjects) {
		const isGlobal =
			normalizeZtcProjectName(configured.projectName) ===
			normalizeZtcProjectName(ZTC_ALL_PROJECTS_RATE_NAME);
		const projectCandidateId = isGlobal
			? null
			: (projectIds.get(projectIdentity(configured.projectName)) ?? null);
		if (!isGlobal && !projectCandidateId) continue;
		for (const rate of configured[category]) {
			const key = `${projectCandidateId ?? "global"}:${category}:${taskIdentity(rate.task)}`;
			if (!taskIdentity(rate.task) || seenWorks.has(key)) continue;
			seenWorks.add(key);
			const excludedProjectCandidateIds = isGlobal
				? configuredProjects
						.filter(
							(project) =>
								normalizeZtcProjectName(project.projectName) !==
									normalizeZtcProjectName(ZTC_ALL_PROJECTS_RATE_NAME) &&
								getZtcExcludedRateTaskKeys(
									project.excludedTasks,
									category,
								).has(normalizeZtcRateTaskKey(rate.task)),
						)
						.map((project) => projectIds.get(projectIdentity(project.projectName)))
						.filter((id): id is string => Boolean(id))
				: [];
			works.push({
				id: `work_${works.length}`,
				task: rate.task,
				category,
				projectCandidateId,
				projectName: isGlobal ? null : configured.projectName,
				excludedProjectCandidateIds,
				rate,
			});
		}
	}

	return { projects, works } satisfies CanonicalCatalog;
}

function isWorkCandidateEligible(
	candidate: WorkCandidate,
	projectCandidateId: string | null,
) {
	return (
		(!candidate.projectCandidateId ||
			candidate.projectCandidateId === projectCandidateId) &&
		(!projectCandidateId ||
			!candidate.excludedProjectCandidateIds.includes(projectCandidateId))
	);
}

function exactProjectMatch(
	rawProjectName: string,
	candidates: ProjectCandidate[],
) {
	const key = projectIdentity(rawProjectName);
	const exact =
		candidates.find((candidate) => projectIdentity(candidate.name) === key) ??
		null;
	if (!exact || exact.source === "configured") return exact;

	const hasAuthoritativeAlternative = candidates.some(
		(candidate) =>
			candidate.id !== exact.id &&
			candidate.source === "configured" &&
			(candidate.manual || candidate.hasConfiguredRates) &&
			(resolveZtcCanonicalProjectName({
				extractedProjectName: rawProjectName,
				configuredProjectNames: [candidate.name],
			}).source === "configured" ||
				hasPlausibleProjectNameOverlap(rawProjectName, candidate.name)),
	);

	return hasAuthoritativeAlternative ? null : exact;
}

function isProjectSelectionValid(
	rawProjectName: string,
	candidate: ProjectCandidate,
) {
	const rawNumbers = projectIdentity(rawProjectName).match(/\d+/g) ?? [];
	const candidateNumbers = projectIdentity(candidate.name).match(/\d+/g) ?? [];
	return (
		!rawNumbers.length ||
		!candidateNumbers.length ||
		rawNumbers.join(":") === candidateNumbers.join(":")
	);
}

function exactWorkMatch(
	rawWork: string,
	candidates: WorkCandidate[],
	projectCandidateId: string | null,
) {
	const eligibleCandidates = candidates.filter(
		(candidate) => isWorkCandidateEligible(candidate, projectCandidateId),
	);
	const exact = eligibleCandidates.find(
		(candidate) =>
			taskIdentity(canonicalizeZtcMatchedWorkName(rawWork, candidate.task)) ===
			taskIdentity(rawWork),
	);
	if (
		exact ||
		eligibleCandidates[0]?.category !== "works" ||
		!hasZtcRateCrossSection(rawWork)
	) {
		return exact ?? null;
	}

	const deterministicMatch = findZtcDefaultRateForTask(
		rawWork,
		eligibleCandidates.map((candidate) => candidate.rate),
		{ category: eligibleCandidates[0]?.category ?? "works" },
	);
	return (
		eligibleCandidates.find(
			(candidate) => candidate.rate === deterministicMatch?.entry,
		) ?? null
	);
}

function isSameWorkFamily(left: string, right: string) {
	const leftTokens = new Set(ztcRateMatchTokens(left));
	const rightTokens = new Set(ztcRateMatchTokens(right));
	const shorterSize = Math.min(leftTokens.size, rightTokens.size);
	if (!shorterSize) return false;

	const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
	return overlap / shorterSize >= 0.75;
}

function isWorkSelectionValid(
	rawWork: string,
	candidate: WorkCandidate,
	projectCandidateId: string | null,
	candidates: WorkCandidate[],
) {
	if (!isWorkCandidateEligible(candidate, projectCandidateId)) {
		return false;
	}
	const rawCode = drawingWorkCode(rawWork);
	const candidateCode = drawingWorkCode(candidate.task);
	if (rawCode && candidateCode && rawCode !== candidateCode) return false;
	if (candidate.category !== "works") return true;

	const selectedCrossSection = getZtcRateCrossSectionMatch(
		rawWork,
		candidate.task,
	);
	if (selectedCrossSection.kind === "incompatible") return false;
	if (!hasZtcRateCrossSection(rawWork)) return true;

	const rankedFamilyCandidates = candidates
		.filter(
			(item) =>
				item.category === candidate.category &&
				isWorkCandidateEligible(item, projectCandidateId) &&
				isSameWorkFamily(item.task, candidate.task),
		)
		.map((item) => ({
			item,
			match: getZtcRateCrossSectionMatch(rawWork, item.task),
		}))
		.filter(
			(result) =>
				result.match.kind === "exact" ||
				result.match.kind === "compatible",
		)
		.sort((left, right) => {
			const leftRank = left.match.kind === "exact" ? 2 : 1;
			const rightRank = right.match.kind === "exact" ? 2 : 1;
			return (
				rightRank - leftRank ||
				(left.match.distance ?? Number.POSITIVE_INFINITY) -
					(right.match.distance ?? Number.POSITIVE_INFINITY)
			);
		});
	const bestMatch = rankedFamilyCandidates[0]?.match;
	if (!bestMatch) return false;

	return (
		selectedCrossSection.kind === bestMatch.kind &&
		selectedCrossSection.distance === bestMatch.distance
	);
}

function rawWorkResult(
	rawWork: string,
	rawIndex: number,
): ZtcCanonicalWorkMatch {
	return {
		rawIndex,
		rawWork,
		task: null,
		canonicalWork: rawWork,
		confidence: 0,
		source: "raw",
		rate: null,
	};
}

function modelCacheKey(args: {
	siteId: string;
	rawProjectName: string;
	rawWorks: string[];
	category: ZtcRateCategory;
	catalog: CanonicalCatalog;
}) {
	return JSON.stringify({
		siteId: args.siteId,
		rawProjectName: normalizeZtcProjectName(args.rawProjectName),
		rawWorks: args.rawWorks.map(taskIdentity),
		category: args.category,
		projectCandidates: args.catalog.projects.map((candidate) => [
			candidate.id,
			candidate.name,
			candidate.manual,
			candidate.hasConfiguredRates,
		]),
		workCandidates: args.catalog.works.map((candidate) => [
			candidate.id,
			candidate.task,
			candidate.projectCandidateId,
			candidate.excludedProjectCandidateIds,
		]),
	});
}

async function callCanonicalMatcher(args: {
	rawProjectName: string;
	rawWorks: Array<{ rawIndex: number; value: string }>;
	catalog: CanonicalCatalog;
}) {
	const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	const response = await openai.responses.parse(
		{
			model: ZTC_CANONICAL_MATCH_MODEL,
			reasoning: { effort: ZTC_CANONICAL_MATCH_REASONING_EFFORT },
			store: false,
			max_output_tokens: 1600,
			instructions:
				"You link noisy OCR and speech-extracted ZTC production entities to authoritative candidates. Select candidate IDs only; never create or rewrite a candidate. Return null when no candidate represents the same real entity. Latvian inflections, translations, abbreviations, and OCR substitutions may refer to the same entity. Project suffix codes such as (rd) and (zp) are strong identifiers and conflicting codes must not be matched. Prefer a manual or configured candidate with rates over an empty OCR-created duplicate when they represent the same project. For works, use the selected project or global candidates, preserve the raw row association, and treat drawing codes, material, dimensions, and construction meaning as evidence. Do not force a match when the evidence conflicts. Return one work result for every supplied rawIndex.",
			input: JSON.stringify({
				rawProjectName: args.rawProjectName || null,
				rawWorks: args.rawWorks,
				projectCandidates: args.catalog.projects.map((candidate) => ({
					id: candidate.id,
					name: candidate.name,
					manual: candidate.manual,
					hasConfiguredRates: candidate.hasConfiguredRates,
					source: candidate.source,
				})),
				workCandidates: args.catalog.works.map((candidate) => ({
					id: candidate.id,
					task: candidate.task,
					projectCandidateId: candidate.projectCandidateId,
					projectName: candidate.projectName,
					category: candidate.category,
				})),
			}),
			text: {
				format: zodTextFormat(
					canonicalMatchSchema,
					"ztc_canonical_entity_match",
				),
			},
		},
		{ timeout: ZTC_CANONICAL_MATCH_TIMEOUT_MS },
	);
	if (!response.output_parsed) {
		throw new Error("ZTC canonical matcher returned no parsed output");
	}
	return response.output_parsed as CanonicalModelMatch;
}

export async function matchZtcCanonicalEntities(args: {
	siteId: string;
	rawProjectName?: string | null;
	rawWorks?: string[];
	category?: ZtcRateCategory;
}): Promise<ZtcCanonicalEntityMatch> {
	const rawProjectName = String(args.rawProjectName ?? "").trim();
	const rawWorks = (args.rawWorks ?? []).map((work) =>
		String(work ?? "").trim(),
	);
	const category = args.category ?? "works";
	const catalog = await loadCanonicalCatalog(args.siteId, category);
	const exactProject = rawProjectName
		? exactProjectMatch(rawProjectName, catalog.projects)
		: null;
	const exactWorks = rawWorks.map((rawWork, rawIndex) => ({
		rawIndex,
		rawWork,
		candidate: rawWork
			? exactWorkMatch(rawWork, catalog.works, exactProject?.id ?? null)
			: null,
	}));
	const unresolvedWorks = exactWorks
		.filter((work) => work.rawWork && !work.candidate)
		.map((work) => ({ rawIndex: work.rawIndex, value: work.rawWork }));
	const needsModel =
		Boolean(rawProjectName && !exactProject && catalog.projects.length) ||
		Boolean(unresolvedWorks.length && catalog.works.length);

	if (!needsModel) {
		return {
			project: rawProjectName
				? exactProject
					? { name: exactProject.name, confidence: 1, source: "exact" }
					: { name: rawProjectName, confidence: 0, source: "raw" }
				: null,
			works: exactWorks.map((work) =>
				work.candidate
					? {
							rawIndex: work.rawIndex,
							rawWork: work.rawWork,
							task: work.candidate.task,
							canonicalWork: canonicalizeZtcMatchedWorkName(
								work.rawWork,
								work.candidate.task,
							),
							confidence: 1,
							source: "exact",
							rate: work.candidate.rate,
						}
					: rawWorkResult(work.rawWork, work.rawIndex),
			),
			modelCalled: false,
		};
	}

	const cacheKey = modelCacheKey({
		siteId: args.siteId,
		rawProjectName,
		rawWorks,
		category,
		catalog,
	});
	const cached = canonicalMatchCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) return cached.value;

	let modelMatch: CanonicalModelMatch | null = null;
	try {
		modelMatch = await callCanonicalMatcher({
			rawProjectName,
			rawWorks: unresolvedWorks,
			catalog,
		});
	} catch (error) {
		console.error("ZTC canonical entity matching failed", {
			siteId: args.siteId,
			model: ZTC_CANONICAL_MATCH_MODEL,
			category,
			rawProjectName,
			rawWorks,
			error,
		});
	}

	const selectedProject = exactProject
		? exactProject
		: modelMatch?.projectCandidateId
			? (catalog.projects.find(
					(candidate) => candidate.id === modelMatch?.projectCandidateId,
				) ?? null)
			: null;
	const acceptedProject =
		selectedProject &&
		(exactProject ||
			(modelMatch?.projectConfidence ?? 0) >= ZTC_PROJECT_MATCH_CONFIDENCE) &&
		isProjectSelectionValid(rawProjectName, selectedProject)
			? selectedProject
			: null;
	const projectCandidateId = acceptedProject?.id ?? exactProject?.id ?? null;
	const modelWorksByIndex = new Map(
		(modelMatch?.workMatches ?? []).map((match) => [match.rawIndex, match]),
	);
	const workCandidatesById = new Map(
		catalog.works.map((candidate) => [candidate.id, candidate]),
	);
	const works = exactWorks.map((work) => {
		if (work.candidate) {
			return {
				rawIndex: work.rawIndex,
				rawWork: work.rawWork,
				task: work.candidate.task,
				canonicalWork: canonicalizeZtcMatchedWorkName(
					work.rawWork,
					work.candidate.task,
				),
				confidence: 1,
				source: "exact" as const,
				rate: work.candidate.rate,
			};
		}
		const modelWork = modelWorksByIndex.get(work.rawIndex);
		const candidate = modelWork?.workCandidateId
			? (workCandidatesById.get(modelWork.workCandidateId) ?? null)
			: null;
		if (
			!candidate ||
			(modelWork?.confidence ?? 0) < ZTC_WORK_MATCH_CONFIDENCE ||
			!isWorkSelectionValid(
				work.rawWork,
				candidate,
				projectCandidateId,
				catalog.works,
			)
		) {
			return rawWorkResult(work.rawWork, work.rawIndex);
		}
		return {
			rawIndex: work.rawIndex,
			rawWork: work.rawWork,
			task: candidate.task,
			canonicalWork: canonicalizeZtcMatchedWorkName(
				work.rawWork,
				candidate.task,
			),
			confidence: modelWork?.confidence ?? 0,
			source: "llm" as const,
			rate: candidate.rate,
		};
	});
	const result: ZtcCanonicalEntityMatch = {
		project: rawProjectName
			? acceptedProject
				? {
						name: acceptedProject.name,
						confidence: exactProject ? 1 : (modelMatch?.projectConfidence ?? 0),
						source: exactProject ? "exact" : "llm",
					}
				: { name: rawProjectName, confidence: 0, source: "raw" }
			: null,
		works,
		modelCalled: true,
	};

	canonicalMatchCache.set(cacheKey, {
		value: result,
		expiresAt: Date.now() + ZTC_CANONICAL_MATCH_CACHE_MS,
	});
	console.log("ZTC canonical entities matched", {
		siteId: args.siteId,
		model: ZTC_CANONICAL_MATCH_MODEL,
		reasoningEffort: ZTC_CANONICAL_MATCH_REASONING_EFFORT,
		category,
		rawProjectName,
		canonicalProjectName: result.project?.name ?? null,
		projectSource: result.project?.source ?? null,
		works: result.works.map((work) => ({
			rawWork: work.rawWork,
			canonicalWork: work.canonicalWork,
			source: work.source,
			confidence: work.confidence,
		})),
	});
	return result;
}
