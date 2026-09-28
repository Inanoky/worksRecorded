import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { TgemInvoiceSourceContext } from "@/lib/tgem-invoice-approval/intake";
import type { TgemInvoiceOcrResult } from "@/lib/tgem-invoice-approval/ocr-types";

export const DEFAULT_TGEM_PROJECT_AUTO_ASSIGN_CONFIDENCE = 0.85;
export const DEFAULT_TGEM_PROJECT_AUTO_ASSIGN_MARGIN = 0.15;

export type TgemProjectCandidate = {
	id: string;
	name: string;
	description: string;
	subdirectory: string;
	bisCaseNumber: string | null;
	bisCaseName: string | null;
};

const evidenceSourceSchema = z.enum([
	"email_sender",
	"email_subject",
	"email_cc",
	"email_description",
	"document_project_name",
	"document_project_code",
	"document_purchase_order",
	"document_contract",
	"document_address",
]);

const projectResolutionSchema = z.object({
	candidates: z.array(
		z.object({
			siteId: z.string(),
			confidence: z.number().min(0).max(1),
			evidence: z.array(evidenceSourceSchema),
		}),
	),
	conflictDetected: z.boolean(),
});

type ModelResolution = z.infer<typeof projectResolutionSchema>;

export type TgemProjectResolutionTransport = (input: {
	projects: TgemProjectCandidate[];
	sourceContext: TgemInvoiceSourceContext;
	documentText: string;
	documentFields: Record<string, string | number | null>;
}) => Promise<ModelResolution>;

function boundedRatio(value: string | undefined, fallback: number) {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
		? parsed
		: fallback;
}

export function getTgemProjectResolutionThresholds(
	env: Record<string, string | undefined> = process.env,
) {
	return {
		confidence: boundedRatio(
			env.TGEM_PROJECT_AUTO_ASSIGN_CONFIDENCE,
			DEFAULT_TGEM_PROJECT_AUTO_ASSIGN_CONFIDENCE,
		),
		margin: boundedRatio(
			env.TGEM_PROJECT_AUTO_ASSIGN_MARGIN,
			DEFAULT_TGEM_PROJECT_AUTO_ASSIGN_MARGIN,
		),
	};
}

function normalizeMatchText(value: string) {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function includesAlias(text: string, alias: string | null | undefined) {
	const normalizedAlias = normalizeMatchText(alias ?? "");
	return normalizedAlias.length >= 4 && text.includes(normalizedAlias);
}

function getDocumentFields(result: TgemInvoiceOcrResult) {
	return Object.fromEntries(
		Object.entries(result.fields).map(([name, field]) => [name, field.value]),
	);
}

function buildDocumentText(result: TgemInvoiceOcrResult) {
	return result.pages
		.map((page) => page.text)
		.join("\n")
		.slice(0, 16_000);
}

function getDeterministicEvidence(
	project: TgemProjectCandidate,
	sourceContext: TgemInvoiceSourceContext,
	documentText: string,
) {
	const subject = normalizeMatchText(sourceContext.subject ?? "");
	const description = normalizeMatchText(sourceContext.description ?? "");
	const document = normalizeMatchText(documentText);
	const projectNames = [project.name, project.bisCaseName];
	const projectCodes = [project.subdirectory, project.bisCaseNumber];
	const evidence: Array<z.infer<typeof evidenceSourceSchema>> = [];
	let confidence = 0;

	if (projectCodes.some((alias) => includesAlias(subject, alias))) {
		evidence.push("email_subject");
		confidence = Math.max(confidence, 0.99);
	}
	if (projectNames.some((alias) => includesAlias(subject, alias))) {
		evidence.push("email_subject");
		confidence = Math.max(confidence, 0.97);
	}
	if (projectCodes.some((alias) => includesAlias(description, alias))) {
		evidence.push("email_description");
		confidence = Math.max(confidence, 0.96);
	}
	if (projectNames.some((alias) => includesAlias(description, alias))) {
		evidence.push("email_description");
		confidence = Math.max(confidence, 0.9);
	}
	if (projectCodes.some((alias) => includesAlias(document, alias))) {
		evidence.push("document_project_code");
		confidence = Math.max(confidence, 0.99);
	}
	if (projectNames.some((alias) => includesAlias(document, alias))) {
		evidence.push("document_project_name");
		confidence = Math.max(confidence, 0.94);
	}

	return { confidence, evidence: [...new Set(evidence)] };
}

export function createTgemProjectResolutionTransport(): TgemProjectResolutionTransport {
	const apiKey = process.env.OPENAI_API_KEY?.trim();
	if (!apiKey)
		throw new Error("TGEM project resolution requires OPENAI_API_KEY");
	const client = new OpenAI({ apiKey });

	return async (input) => {
		const response = await client.responses.parse({
			model:
				process.env.TGEM_PROJECT_RESOLUTION_MODEL?.trim() ||
				process.env.TGEM_INVOICE_OPENAI_MODEL?.trim() ||
				"gpt-5.4",
			store: false,
			instructions: [
				"Rank only the supplied construction projects for this invoice.",
				"Use email subject and explicit project codes or names as strong evidence.",
				"Use CC and sender only as supporting evidence because suppliers can serve multiple projects.",
				"Use purchase orders, contract references, project names, and construction or delivery addresses from the document.",
				"Return low confidence when evidence is indirect. Mark conflictDetected when strong email and document evidence point to different projects.",
				"Never return a project ID that is not present in the supplied candidate list.",
			].join(" "),
			input: JSON.stringify(input),
			text: {
				format: zodTextFormat(
					projectResolutionSchema,
					"tgem_project_resolution",
				),
			},
		});
		if (!response.output_parsed) {
			throw new Error("OpenAI project resolution returned no parsed output");
		}
		return response.output_parsed;
	};
}

export async function resolveTgemInvoiceProject(input: {
	projects: TgemProjectCandidate[];
	sourceContext: TgemInvoiceSourceContext;
	result: TgemInvoiceOcrResult;
	env?: Record<string, string | undefined>;
	transport?: TgemProjectResolutionTransport;
}) {
	const thresholds = getTgemProjectResolutionThresholds(input.env);
	if (input.projects.length === 0) {
		return {
			selectedSiteId: null,
			confidence: 0,
			method: "unassigned" as const,
			summary: {
				...thresholds,
				conflictDetected: false,
				reason: "no_projects",
				candidates: [],
			},
		};
	}

	const documentText = buildDocumentText(input.result);
	const deterministic = new Map(
		input.projects.map((project) => [
			project.id,
			getDeterministicEvidence(project, input.sourceContext, documentText),
		]),
	);
	const modelResult = await (
		input.transport ?? createTgemProjectResolutionTransport()
	)({
		projects: input.projects,
		sourceContext: {
			sender: input.sourceContext.sender?.slice(0, 320) ?? null,
			subject: input.sourceContext.subject?.slice(0, 500) ?? null,
			cc: input.sourceContext.cc?.slice(0, 20) ?? [],
			description: input.sourceContext.description?.slice(0, 8_000) ?? null,
		},
		documentText,
		documentFields: getDocumentFields(input.result),
	});
	const allowedProjectIds = new Set(
		input.projects.map((project) => project.id),
	);
	const modelCandidates = new Map(
		modelResult.candidates
			.filter((candidate) => allowedProjectIds.has(candidate.siteId))
			.map((candidate) => [candidate.siteId, candidate]),
	);
	const candidates = input.projects
		.map((project) => {
			const exact = deterministic.get(project.id);
			const model = modelCandidates.get(project.id);
			return {
				siteId: project.id,
				confidence: Math.max(exact?.confidence ?? 0, model?.confidence ?? 0),
				evidence: [
					...new Set([...(exact?.evidence ?? []), ...(model?.evidence ?? [])]),
				],
			};
		})
		.sort((left, right) => right.confidence - left.confidence);
	const highConfidenceExactMatches = candidates.filter(
		(candidate) =>
			(candidate.evidence.includes("email_subject") ||
				candidate.evidence.includes("document_project_code")) &&
			candidate.confidence >= thresholds.confidence,
	);
	const conflictDetected =
		modelResult.conflictDetected || highConfidenceExactMatches.length > 1;
	const best = candidates[0];
	const runnerUp = candidates[1];
	const margin = best ? best.confidence - (runnerUp?.confidence ?? 0) : 0;
	const hasStrongEvidence = Boolean(
		best?.evidence.some(
			(evidence) => evidence !== "email_sender" && evidence !== "email_cc",
		),
	);
	const selectedSiteId =
		best &&
		hasStrongEvidence &&
		best.confidence >= thresholds.confidence &&
		margin >= thresholds.margin &&
		!conflictDetected
			? best.siteId
			: null;

	return {
		selectedSiteId,
		confidence: best?.confidence ?? 0,
		method: selectedSiteId ? ("automatic" as const) : ("unassigned" as const),
		summary: {
			...thresholds,
			margin,
			conflictDetected,
			reason: selectedSiteId
				? "thresholds_met"
				: !hasStrongEvidence
					? "insufficient_evidence"
					: conflictDetected
						? "conflicting_evidence"
						: (best?.confidence ?? 0) < thresholds.confidence
							? "low_confidence"
							: "insufficient_margin",
			candidates: candidates.slice(0, 5),
		},
	};
}
