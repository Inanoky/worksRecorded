import { z } from "zod";
import { groundDiarySourceQuotes } from "./diarySourceQuotes";

export const calculationEvidenceSchema = z
	.object({
		lengthQuote: z.string().min(1).max(500),
		rateQuote: z.string().min(1).max(700),
	})
	.nullable()
	.optional();

export const CALCULATION_INSTRUCTIONS =
	"For a quantity calculated from an explicitly reported pipe length and a volume-per-metre rate, populate calculationEvidence with lengthQuote and rateQuote copied exactly from the original message. rateQuote must identify this work and its rate, including per-metre wording. Put the calculated total in the configured quantity field, m3 in units and the equation in Comments. Do not use workers, hours, dimensions, history or catalogue norms as calculation operands. Otherwise calculationEvidence is null.";

function numbers(text: string, pattern: RegExp) {
	return [
		...new Set(
			[...text.matchAll(pattern)].map((match) =>
				Number(match[1].replace(",", ".")),
			),
		),
	];
}

function identifiesWork(work: string, quote: string) {
	const genericWorkEvidence: Record<string, RegExp> = {
		excavation:
			/(?:(?:grunts|grunti|tranšej\p{L}*).{0,80}(?:rakšan\p{L}*|izrak\p{L}*)|(?:rakšan\p{L}*|izrak\p{L}*).{0,80}(?:grunts|grunti|tranšej\p{L}*)|\bexcavat\p{L}*)/iu,
		trenching:
			/(?:tranšej\p{L}*.{0,60}(?:rakšan\p{L}*|izrak\p{L}*)|(?:rakšan\p{L}*|izrak\p{L}*).{0,60}tranšej\p{L}*|\btrenching\b)/iu,
		backfilling:
			/(?:tranšej\p{L}*.{0,60}aizbēr\p{L}*|aizbēr\p{L}*.{0,60}tranšej\p{L}*|\bbackfilling\b)/iu,
	};
	if (genericWorkEvidence[work.trim().toLocaleLowerCase("lv")]?.test(quote))
		return true;
	const code = work.match(/^\d+(?:\.\d+)*/)?.[0];
	if (
		code &&
		[...quote.matchAll(/\d+(?:\.\d+)+/g)].some(
			([value]) => value === code || value.endsWith(`.${code}`),
		)
	)
		return true;
	const description =
		work
			.replace(/^\d+(?:\.\d+)*\s*/, "")
			.split(/\s+-\s+/)
			.at(-1) ?? work;
	const words = [
		...new Set(
			(description.toLocaleLowerCase("lv").match(/\p{L}{4,}/gu) ?? []).map(
				(word) => word.slice(0, 4),
			),
		),
	];
	const lower = quote.toLocaleLowerCase("lv");
	return (
		words.length >= 2 &&
		words.filter((word) => lower.includes(word)).length >= 2
	);
}

export function hasSourceCalculation(
	row: Record<string, unknown>,
	source: string,
) {
	const parsed = calculationEvidenceSchema.safeParse(row.calculationEvidence);
	if (
		!parsed.success ||
		!parsed.data ||
		typeof row.Amounts !== "number" ||
		!Number.isFinite(row.Amounts)
	)
		return false;
	if (!/^m(?:3|³)$/i.test(String(row.Units))) return false;
	const { lengthQuote, rateQuote } = parsed.data;
	if (
		!groundDiarySourceQuotes(source, [lengthQuote], 1) ||
		!groundDiarySourceQuotes(source, [rateQuote], 1) ||
		!identifiesWork(String(row.Works ?? ""), rateQuote)
	)
		return false;
	if (
		!/(?:uz\s+(?:(?:vienu|tekošo|tekošā|iebūvēto|caurules)\s+){0,4}metru\b|uz\s+katru(?:\s+no\s+šiem)?(?:\s+\d+(?:[,.]\d+)?)?\s+(?:metru|metriem)\b|(?:m[3³]|kubikmetr\p{L}*)\s+(?:(?:vienu|tekošo|tekošā|iebūvēto|caurules)\s+){1,4}metru\b|m[3³]\s*\/\s*m\b)/iu.test(
			rateQuote,
		)
	)
		return false;
	const lengths = numbers(
		lengthQuote,
		/(\d+(?:[,.]\d+)?)\s*(?:metriem|metrus|metru|metri|metrs|m)(?![\p{L}\p{N}²³])/giu,
	);
	const rates = numbers(
		rateQuote,
		/(\d+(?:[,.]\d+)?)\s*(?:m[3³]|kubikmetr\p{L}*)(?![\p{L}\p{N}])/giu,
	);
	if (
		lengths.length !== 1 ||
		rates.length !== 1 ||
		lengths[0] <= 0 ||
		rates[0] <= 0
	)
		return false;
	const referencedLength = rateQuote.match(
		/uz\s+katru(?:\s+no\s+šiem)?\s+(\d+(?:[,.]\d+)?)\s+metriem/iu,
	);
	if (
		referencedLength &&
		Number(referencedLength[1].replace(",", ".")) !== lengths[0]
	)
		return false;
	return Math.abs(row.Amounts - lengths[0] * rates[0]) < 0.005;
}
