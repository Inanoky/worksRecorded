import OpenAI from "openai";
import { z } from "zod";
import { ZTC_OPENAI_MODEL, ZTC_OPENAI_REASONING_EFFORT } from "./openai-config";

export type ZtcAdditionalDetail = {
	description: string;
	quantity: number | null;
	sourceText?: string;
};

const extractionSchema = z.object({
	details: z.array(
		z.object({
			description: z.string().trim().min(1),
			quantity: z.number().positive().finite().nullable(),
			sourceText: z.string().trim().min(1),
		}),
	),
	noneReason: z.enum(["no_details", "negated", "question"]).nullable(),
});

export class ZtcAdditionalDetailExtractionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ZtcAdditionalDetailExtractionError";
	}
}

function normalizeEvidence(value: string) {
	return value
		.normalize("NFKC")
		.toLocaleLowerCase("lv")
		.replace(/\s+/g, " ")
		.trim();
}

export function hasZtcAdditionalDetailReport(text: string) {
	const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	return /\bpapild(?:u|us)?\s*detal/i.test(normalized);
}

export function parseZtcAdditionalDetailExtraction(
	text: string,
	value: unknown,
) {
	const parsed = extractionSchema.safeParse(value);
	if (!parsed.success)
		throw new ZtcAdditionalDetailExtractionError(
			"Invalid additional-detail extraction",
		);
	const { details, noneReason } = parsed.data;
	if (details.length && noneReason)
		throw new ZtcAdditionalDetailExtractionError(
			"Conflicting additional-detail extraction",
		);
	if (
		!details.length &&
		(!noneReason ||
			(hasZtcAdditionalDetailReport(text) && noneReason === "no_details"))
	) {
		throw new ZtcAdditionalDetailExtractionError(
			"Reported additional details were not extracted",
		);
	}
	for (const detail of details) {
		if (
			!normalizeEvidence(text).includes(normalizeEvidence(detail.sourceText))
		) {
			throw new ZtcAdditionalDetailExtractionError(
				"Additional detail has no source evidence",
			);
		}
	}
	return details;
}

export async function extractZtcAdditionalDetails(
	text: string,
): Promise<ZtcAdditionalDetail[]> {
	const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	const response = await openai.chat.completions.create({
		model: ZTC_OPENAI_MODEL,
		reasoning_effort: ZTC_OPENAI_REASONING_EFFORT,
		response_format: { type: "json_object" },
		messages: [
			{
				role: "system",
				content:
					'Extract additional installed parts from a Latvian worker message. This is independent of the main task, drawing work options and rate catalog. Details can accompany completion of ANY work, including Papilddarbi such as packaging, or be reported on their own. Return JSON {details:[{description:string,quantity:number|null,sourceText:string}],noneReason:"no_details"|"negated"|"question"|null}. Include EVERY distinct affirmative detail type with its OWN quantity. Interpret Latvian endings, missing accents, typos and spoken numbers. For example "Pabeidzu papilddetalas kārbu iestrāde 1 gab papilddetaļas cilpu iestrāde 2 gab" contains TWO detail types: kārbu iestrāde quantity 1 and cilpu iestrāde quantity 2. Also split "papildus 2 kronšteini un 4 skrūves" into two types. description is the concise original work/part meaning, without quantity words; never substitute an available rate. sourceText must be an exact quote from the supplied message supporting that item and its quantity. Do not confuse panel numbers, dimensions or the main job area with detail quantities. Keep quantity null when the count was not stated; NEVER default it to 1. Do not include ordinary main work as a detail. noneReason must be null when details are present. An explicit detail report with missing quantities still requires detail items with quantity null. Use an empty details array only when the message contains no details, explicitly negates their installation, or asks a question rather than reporting work; state the corresponding noneReason.',
			},
			{ role: "user", content: text },
		],
	});
	let value: unknown;
	try {
		value = JSON.parse(response.choices[0]?.message?.content ?? "");
	} catch {
		throw new ZtcAdditionalDetailExtractionError(
			"Additional-detail response is empty or invalid JSON",
		);
	}
	return parseZtcAdditionalDetailExtraction(text, value);
}
