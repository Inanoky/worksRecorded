import type { Prisma } from "@prisma/client";
import { normalizeForma2PositionCode } from "./forma2-position-code";

type Json = Prisma.JsonValue;

function object(value: Json | undefined): Prisma.JsonObject {
	return value && typeof value === "object" && !Array.isArray(value)
		? value
		: {};
}

export function prepareForma2CodeRepair(analytics: Json, config: Json) {
	const root = object(analytics);
	const state = object(root.defaultConstructionForma2);
	const document = object(state.document);
	const positions = Array.isArray(document.positions) ? document.positions : [];
	const codeChanges = new Map<string, string>();
	let changedPositions = 0;
	const correctedPositions = positions.map((value) => {
		const position = object(value);
		const corrected = { ...position };
		for (const field of ["code", "categoryCode"] as const) {
			const code = position[field];
			if (typeof code !== "string" || !code.includes(",")) continue;
			const next = normalizeForma2PositionCode(code);
			if (code === next) continue;
			corrected[field] = next;
			codeChanges.set(code, next);
			const nameField = field === "code" ? "name" : "categoryName";
			if (position[nameField] === code) corrected[nameField] = next;
		}
		if (JSON.stringify(position) !== JSON.stringify(corrected))
			changedPositions++;
		return corrected;
	});

	const originalCodesByNormalized = new Map<string, Set<string>>();
	for (const value of positions) {
		const code = object(value).code;
		if (typeof code !== "string" || !code) continue;
		const normalized = normalizeForma2PositionCode(code);
		const originals =
			originalCodesByNormalized.get(normalized) ?? new Set<string>();
		originals.add(code);
		originalCodesByNormalized.set(normalized, originals);
		if (
			originals.size > 1 &&
			[...originals].some((original) => codeChanges.has(original))
		)
			throw new Error(
				`Position code collision: ${[...originals].join(" / ")} -> ${normalized}`,
			);
	}

	const workRenames = new Map<string, string>();
	const collectWorkNames = (value: Json | undefined): void => {
		if (typeof value === "string") {
			const prefix = /^\d+(?:[.,]\d+)+\.?(?=$|[\s:])/u.exec(value)?.[0];
			if (
				prefix &&
				(codeChanges.has(prefix) ||
					codeChanges.has(prefix.replace(/\.$/, "")) ||
					originalCodesByNormalized.has(normalizeForma2PositionCode(prefix)))
			) {
				const next = normalizeForma2PositionCode(value);
				if (next !== value) workRenames.set(value, next);
			}
		} else if (Array.isArray(value)) {
			value.forEach(collectWorkNames);
		} else if (value && typeof value === "object") {
			Object.values(value).forEach(collectWorkNames);
		}
	};
	const siteConfig = object(config);
	const settings = object(siteConfig.otherSettings);
	collectWorkNames(object(siteConfig.Works).DropDownOptions);
	const manifest = object(settings.defaultConstructionForma2WorkSync);
	if (manifest.documentId === document.id && Array.isArray(manifest.entries))
		manifest.entries.forEach((entry) => {
			collectWorkNames(object(entry).work);
		});
	const productivity = object(settings.defaultConstructionProductivity);
	if (Array.isArray(productivity.works))
		productivity.works.forEach((entry) => {
			collectWorkNames(object(entry).work);
		});

	const renameWorkReferences = (value: Json): Json => {
		if (typeof value === "string") return workRenames.get(value) ?? value;
		if (Array.isArray(value)) return value.map(renameWorkReferences);
		if (!value || typeof value !== "object") return value;
		const result: Prisma.JsonObject = {};
		for (const [key, item] of Object.entries(value)) {
			if (item === undefined) continue;
			const newKey = workRenames.get(key) ?? key;
			const next = /^(?:id|.*Id|.*Ids)$/.test(key)
				? item
				: renameWorkReferences(item);
			if (
				Object.hasOwn(result, newKey) &&
				JSON.stringify(result[newKey]) !== JSON.stringify(next)
			)
				throw new Error(`Work name collision: ${newKey}`);
			result[newKey] = next;
		}
		return result;
	};

	return {
		changedPositions,
		workRenames,
		analytics: changedPositions
			? {
					...root,
					defaultConstructionForma2: {
						...state,
						document: { ...document, positions: correctedPositions },
					},
				}
			: analytics,
		config: renameWorkReferences(config),
	};
}
