function normalizeTaskName(value: unknown) {
	return String(value ?? "")
		.trim()
		.toLowerCase()
		.replace(/^t\s*\d+(?=\s|[-/]|$)/i, "tl")
		.replace(/^t(?!l)(?=\s|[-/]|$)/i, "tl");
}

export function getZtcTaskIdentityKey(value: unknown) {
	const normalized = normalizeTaskName(value);
	const codeMatch = normalized.match(
		/^\s*((?:[lr]\s*\d\s*\/\s*[bt]\s*\d)|tl|l\s*0)(?=\s|[-/]|$)/i,
	);

	if (codeMatch?.[1]) {
		return codeMatch[1].replace(/\s+/g, "").toLowerCase();
	}

	return normalized
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/gi, " ")
		.trim()
		.toLowerCase();
}
