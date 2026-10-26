export type ZtcRateMatchDecision = {
	task: string | null;
	work?: string;
	source: "exact" | "llm" | "raw";
	reason?: string;
};

export function readZtcRateMatchDecision(
	value: unknown,
): ZtcRateMatchDecision | null {
	try {
		const metadata = typeof value === "string" ? JSON.parse(value) : value;
		const decision = metadata?.ztcRateMatch;
		if (!decision || !["exact", "llm", "raw"].includes(decision.source))
			return null;
		if (decision.task !== null && typeof decision.task !== "string")
			return null;
		return decision;
	} catch {
		return null;
	}
}

export function attachZtcRateMatchDecision(
	value: unknown,
	decision: ZtcRateMatchDecision,
) {
	let metadata: Record<string, unknown> = {};
	try {
		const parsed = typeof value === "string" ? JSON.parse(value) : value;
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
			metadata = parsed;
	} catch {}
	return JSON.stringify({ ...metadata, ztcRateMatch: decision });
}
