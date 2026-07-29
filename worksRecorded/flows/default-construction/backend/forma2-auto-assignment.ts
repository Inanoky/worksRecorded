import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
	type Forma2ActualSource,
	type Forma2Allocation,
	type Forma2Position,
	suggestForma2Position,
} from "@/flows/default-construction/lib/forma2-analytics";

const FORMA2_ASSIGNMENT_MODEL =
	process.env.FORMA2_ASSIGNMENT_MODEL?.trim() || "gpt-5.6-terra";
const FORMA2_ASSIGNMENT_TIMEOUT_MS = 240_000;
const LLM_CONFIDENCE_THRESHOLD = 0.72;
const DETERMINISTIC_CONFIDENCE_THRESHOLD = 0.9;
const SOURCE_BATCH_SIZE = 30;
const LLM_CONCURRENCY = 3;
const MAX_CANDIDATES_PER_SOURCE = 24;

const assignmentSchema = z.object({
	assignments: z.array(
		z.object({
			sourceIndex: z.number().int().nonnegative(),
			positionId: z.string().nullable(),
			confidence: z.number().min(0).max(1),
			reason: z.string(),
		}),
	),
});

type SourceGroup = {
	source: Forma2ActualSource;
	sourceIds: string[];
};

function normalize(value: string) {
	return value
		.toLocaleLowerCase("lv")
		.replace(/^\d+(?:\.\d+)+\s*/, "")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim();
}

function tokens(value: string) {
	return new Set(
		normalize(value)
			.split(" ")
			.filter((token) => token.length > 2),
	);
}

function lexicalScore(source: Forma2ActualSource, position: Forma2Position) {
	const sourceTokens = tokens(`${source.label} ${source.secondaryLabel}`);
	const positionTokens = tokens(
		`${position.code} ${position.categoryName} ${position.name}`,
	);
	if (!sourceTokens.size || !positionTokens.size) return 0;
	let intersection = 0;
	for (const token of sourceTokens) {
		if (positionTokens.has(token)) intersection += 1;
	}
	return intersection / Math.max(sourceTokens.size, positionTokens.size);
}

export function isCompatibleForma2Assignment(
	source: Forma2ActualSource,
	position: Forma2Position,
) {
	if (source.type === "work") return position.kind === "work";
	return (
		position.kind === "material" ||
		(position.kind === "work" && !position.parentId)
	);
}

export function getForma2AssignmentCandidates(
	source: Forma2ActualSource,
	positions: Forma2Position[],
) {
	const scored = positions
		.filter((position) => isCompatibleForma2Assignment(source, position))
		.map((position) => ({ position, score: lexicalScore(source, position) }))
		.sort((left, right) => {
			return (
				right.score - left.score ||
				left.position.sourceRow - right.position.sourceRow
			);
		});
	if (source.type === "work") {
		return scored
			.slice(0, MAX_CANDIDATES_PER_SOURCE)
			.map(({ position }) => position);
	}
	const materialCandidates = scored
		.filter(({ position }) => position.kind === "material")
		.slice(0, 18);
	const workFallbacks = scored
		.filter(({ position }) => position.kind === "work")
		.slice(0, MAX_CANDIDATES_PER_SOURCE - materialCandidates.length);
	return [...materialCandidates, ...workFallbacks].map(
		({ position }) => position,
	);
}

function groupSources(sources: Forma2ActualSource[]) {
	const groups = new Map<string, SourceGroup>();
	for (const source of sources) {
		const groupKey = [
			source.type,
			normalize(source.label),
			normalize(source.unit),
		].join("|");
		const current = groups.get(groupKey);
		if (current) current.sourceIds.push(source.id);
		else groups.set(groupKey, { source, sourceIds: [source.id] });
	}
	return Array.from(groups.values());
}

function makeAllocations(
	group: SourceGroup,
	positionId: string,
	confidence: number,
) {
	const assignedAt = new Date().toISOString();
	return group.sourceIds.map(
		(sourceId) =>
			({
				sourceType: group.source.type,
				sourceId,
				positionId,
				method: "automatic",
				confidence,
				assignedAt,
			}) satisfies Forma2Allocation,
	);
}

async function mapBatchWithLlm(args: {
	openai: OpenAI;
	groups: SourceGroup[];
	positions: Forma2Position[];
}) {
	const candidatesBySource = args.groups.map((group) =>
		getForma2AssignmentCandidates(group.source, args.positions),
	);
	const input = args.groups.map((group, sourceIndex) => ({
		sourceIndex,
		type: group.source.type,
		label: group.source.label,
		context: group.source.secondaryLabel,
		invoiceUnit: group.source.unit,
		candidates: candidatesBySource[sourceIndex].map((position) => ({
			positionId: position.id,
			code: position.code,
			category: position.categoryName,
			name: position.name,
			kind: position.kind,
			unit: position.unit,
		})),
	}));
	const response = await args.openai.responses.parse(
		{
			model: FORMA2_ASSIGNMENT_MODEL,
			reasoning: { effort: "low" },
			store: false,
			max_output_tokens: 12_000,
			instructions: [
				"Map factual construction records to the supplied Forma 2 candidates.",
				"Return exactly one result for every sourceIndex and only use a supplied positionId.",
				"Use null when no candidate is semantically defensible.",
				"Work records map to work positions.",
				"Materials should prefer a material child position; use a parent work position only when the Forma 2 has no suitable material child.",
				"Invoice units commonly differ from Forma 2 units. Unit mismatch must never by itself prevent a semantic material match.",
				"Do not convert quantities or calculate costs.",
				"Understand Latvian construction terminology, spelling variants, abbreviations, and supplier invoice descriptions.",
			].join(" "),
			input: JSON.stringify(input),
			text: {
				format: zodTextFormat(assignmentSchema, "forma2_record_assignments"),
			},
		},
		{ timeout: FORMA2_ASSIGNMENT_TIMEOUT_MS },
	);
	if (!response.output_parsed) {
		throw new Error("The AI assignment returned no structured data");
	}
	return response.output_parsed.assignments.flatMap((assignment) => {
		const group = args.groups[assignment.sourceIndex];
		if (!group || !assignment.positionId) return [];
		const candidate = candidatesBySource[assignment.sourceIndex].find(
			(position) => position.id === assignment.positionId,
		);
		if (!candidate || assignment.confidence < LLM_CONFIDENCE_THRESHOLD)
			return [];
		return makeAllocations(
			group,
			candidate.id,
			Number(assignment.confidence.toFixed(2)),
		);
	});
}

export async function automaticallyAssignForma2Sources(args: {
	sources: Forma2ActualSource[];
	positions: Forma2Position[];
	existingAllocations: Forma2Allocation[];
	openai?: OpenAI;
}) {
	const allocatedSourceKeys = new Set(
		args.existingAllocations.map(
			(allocation) => `${allocation.sourceType}:${allocation.sourceId}`,
		),
	);
	const unassignedGroups = groupSources(
		args.sources.filter(
			(source) => !allocatedSourceKeys.has(`${source.type}:${source.id}`),
		),
	);
	const allocations: Forma2Allocation[] = [];
	const unresolved: SourceGroup[] = [];
	for (const group of unassignedGroups) {
		const suggestion = suggestForma2Position(group.source, args.positions);
		if (
			suggestion &&
			suggestion.confidence >= DETERMINISTIC_CONFIDENCE_THRESHOLD
		) {
			allocations.push(
				...makeAllocations(group, suggestion.positionId, suggestion.confidence),
			);
		} else {
			unresolved.push(group);
		}
	}
	if (!unresolved.length) return allocations;
	if (!process.env.OPENAI_API_KEY && !args.openai) {
		throw new Error("OPENAI_API_KEY is not configured");
	}
	const openai =
		args.openai ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	const batches: SourceGroup[][] = [];
	for (let index = 0; index < unresolved.length; index += SOURCE_BATCH_SIZE) {
		batches.push(unresolved.slice(index, index + SOURCE_BATCH_SIZE));
	}
	for (let index = 0; index < batches.length; index += LLM_CONCURRENCY) {
		const results = await Promise.all(
			batches
				.slice(index, index + LLM_CONCURRENCY)
				.map((groups) =>
					mapBatchWithLlm({ openai, groups, positions: args.positions }),
				),
		);
		allocations.push(...results.flat());
	}
	return allocations;
}
