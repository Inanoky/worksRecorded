export function normalizeConstructionWork(value: string) {
	return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function constructionWorkReference(value: string) {
	const text = normalizeConstructionWork(value).trim();
	for (const match of text.matchAll(
		/(?:^|(?:pozicij\p{L}*|position)\s+)(\d+(?:\.\d+)+)\b/gu,
	)) {
		if (
			/^\s*(?:mm|cm|m[23²³]?|met\p{L}*|kubik\p{L}*|kg|tn|stund\p{L}*)(?=$|[^\p{L}\p{N}])/u.test(
				text.slice(match.index + match[0].length),
			)
		)
			continue;
		return match[1];
	}
	return "";
}

export function constructionWorkTokens(value: string) {
	const text = normalizeConstructionWork(value)
		.replace(/^\d+(?:\.\d+)+\s*/, "")
		.replace(/udensvad\p{L}*|\budens\b|water\s*(?:main|supply)/gu, " water ")
		.replace(/kanaliz\p{L}*|sewage|sewer\p{L}*/gu, " sewer ")
		.replace(/caurul\p{L}*|trub\p{L}*|pipes?/gu, " pipe ")
		.replace(/skatak\p{L}*|\baka\p{L}*|manholes?|wells?/gu, " well ")
		.replace(/transej\p{L}*|trenching|trenches/gu, " trench ")
		.replace(/izrak\p{L}*|raksan\p{L}*|excavat\p{L}*/gu, " excavation ")
		.replace(/aizber\p{L}*|backfill\p{L}*/gu, " backfill ")
		.replace(/dzelzsbet\p{L}*|dz\s*\/\s*b|beton\p{L}*|concrete/gu, " concrete ")
		.replace(/polietilen\p{L}*|polyethylene|\bpeh\b/gu, " polyethylene ")
		.replace(/piegad\p{L}*|deliver\p{L}*/gu, " delivery ")
		.replace(/smil\p{L}*|sand/gu, " sand ")
		.replace(
			/uzstad\p{L}*|iebuv\p{L}*|montaz\p{L}*|iekl\p{L}*|install\p{L}*/gu,
			" install ",
		);
	return new Set(
		(text.match(/[\p{L}\p{N}]{3,}/gu) ?? []).map((word) => word.slice(0, 6)),
	);
}

function specs(value: string) {
	const text = normalizeConstructionWork(value);
	const tokens = constructionWorkTokens(value);
	return {
		systems: ["water", "sewer"].filter((word) => tokens.has(word)),
		assets: ["pipe", "well"].filter((word) => tokens.has(word)),
		materials: [
			...(/\bpe(?:h|100|80)?\b|polietilen|polyethylene/u.test(text)
				? ["pe"]
				: []),
			...(/\bpp\b|polipropilen|polypropylene/u.test(text) ? ["pp"] : []),
			...(/\bpvc\b/u.test(text) ? ["pvc"] : []),
			...(tokens.has("concre") ? ["concrete"] : []),
		],
		diameters: [
			...text.matchAll(
				/(?:\b(?:od|dn|d)|[ø⌀]|diametr\p{L}*)\s*(\d+(?:[.,]\d+)?)/gu,
			),
		].map((match) => String(Number(match[1].replace(",", ".")))),
	};
}

export function constructionWorkConflicts(source: string, candidate: string) {
	const left = specs(source);
	const right = specs(candidate);
	return (["systems", "assets", "materials", "diameters"] as const).filter(
		(field) =>
			left[field].length &&
			right[field].length &&
			!left[field].some((value) => right[field].includes(value)),
	);
}

export function constructionWorkSimilarity(source: string, candidate: string) {
	const left = constructionWorkTokens(source);
	const right = constructionWorkTokens(candidate);
	if (!left.size || !right.size) return 0;
	const shared = [...left].filter((word) => right.has(word)).length;
	return shared / (left.size + right.size - shared);
}
