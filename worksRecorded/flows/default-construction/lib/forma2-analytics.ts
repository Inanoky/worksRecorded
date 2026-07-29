export const DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY =
	"defaultConstructionForma2";

export type Forma2PositionKind = "work" | "material" | "mechanism";
export type Forma2SourceType = "work" | "material";

export type Forma2Position = {
	id: string;
	code: string;
	categoryCode: string;
	categoryName: string;
	name: string;
	kind: Forma2PositionKind;
	parentId: string | null;
	sourceRow: number;
	unit: string;
	plannedQuantity: number | null;
	laborNormHoursPerUnit: number | null;
	hourlyRate: number | null;
	plannedWorkCost: number;
	plannedMaterialCost: number;
	plannedMechanismCost: number;
	plannedTotalCost: number;
};

export type Forma2Document = {
	id: string;
	fileName: string;
	sheetName: string;
	importedAt: string;
	positions: Forma2Position[];
};

export type Forma2Allocation = {
	sourceType: Forma2SourceType;
	sourceId: string;
	positionId: string;
	method: "manual" | "automatic" | "rule";
	confidence: number | null;
	assignedAt: string;
	ruleId?: string | null;
};

export type Forma2MaterialRule = {
	id: string;
	normalizedName: string;
	displayName: string;
	positionId: string;
	createdAt: string;
	createdBy: string | null;
};

export type DefaultConstructionForma2State = {
	version: 1;
	document: Forma2Document | null;
	allocations: Forma2Allocation[];
	materialRules: Forma2MaterialRule[];
};

export type Forma2ActualSource = {
	id: string;
	type: Forma2SourceType;
	label: string;
	secondaryLabel: string;
	date: string | null;
	unit: string;
	quantity: number | null;
	hours: number | null;
	hourlyRate?: number | null;
	actualCost: number | null;
};

export type Forma2MappingRow = Forma2ActualSource & {
	assignedPositionId: string | null;
	suggestedPositionId: string | null;
	suggestionConfidence: number | null;
	suggestionReason: "code" | "name" | "similarity" | null;
};

export type Forma2ResultRow = Forma2Position & {
	actualWorkCost: number;
	actualMaterialCost: number;
	actualMechanismCost: number;
	actualTotalCost: number;
	variance: number;
	assignedRecords: number;
};

export type Forma2AnalyticsView = {
	summary: {
		positions: number;
		factualRecords: number;
		assignedRecords: number;
		unassignedRecords: number;
		pricedRecords: number;
		unpricedRecords: number;
		plannedCost: number;
		factualCost: number;
		assignedCost: number;
		unassignedCost: number;
		variance: number;
	};
	mappingRows: Forma2MappingRow[];
	resultRows: Forma2ResultRow[];
};

export type ParsedForma2Sheet = {
	sheetName: string;
	positions: Forma2Position[];
	warnings: string[];
};

const EMPTY_STATE: DefaultConstructionForma2State = {
	version: 1,
	document: null,
	allocations: [],
	materialRules: [],
};

const round = (value: number) => Number(value.toFixed(2));

function text(value: unknown) {
	return String(value ?? "")
		.replace(/\s+/g, " ")
		.trim();
}

function key(value: unknown) {
	return text(value).toLocaleLowerCase("lv");
}

export function normalizeForma2MaterialRuleName(value: unknown) {
	return key(value)
		.normalize("NFKC")
		.replace(/(\d)(\p{L})/gu, "$1 $2")
		.replace(/(\p{L})(\d)/gu, "$1 $2")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function numberOrNull(value: unknown) {
	if (value == null || value === "") return null;
	let cleaned = text(value)
		.replace(/\u00a0/g, "")
		.replace(/\s/g, "")
		.replace(/€/g, "");
	const lastComma = cleaned.lastIndexOf(",");
	const lastDot = cleaned.lastIndexOf(".");
	if (lastComma >= 0 && lastDot >= 0) {
		cleaned =
			lastComma > lastDot
				? cleaned.replace(/\./g, "").replace(",", ".")
				: cleaned.replace(/,/g, "");
	} else if (lastComma >= 0) {
		cleaned = cleaned.replace(",", ".");
	}
	const parsed = Number(cleaned);
	return Number.isFinite(parsed) ? parsed : null;
}

function nonNegative(value: unknown) {
	const parsed = numberOrNull(value);
	return parsed != null && parsed >= 0 ? parsed : 0;
}

function safeIdPart(value: string) {
	return key(value)
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 48);
}

export function createForma2PositionId(args: {
	kind: Forma2PositionKind;
	code: string;
	name: string;
	sourceRow: number;
}) {
	return [
		args.kind,
		safeIdPart(args.code || "child"),
		safeIdPart(args.name),
		args.sourceRow,
	].join(":");
}

function positionCode(value: unknown) {
	const candidate = text(value);
	return /^\d+(?:\.\d+)+$/.test(candidate) ? candidate : "";
}

function categoryCode(value: unknown) {
	const candidate = text(value);
	return /^\d+$/.test(candidate) ? candidate : "";
}

function findHeaderRow(rows: unknown[][]) {
	return rows.findIndex((row) => {
		const joined = key(row.join(" "));
		return (
			joined.includes("būvdarbu nosaukums") && joined.includes("mērvienība")
		);
	});
}

function findColumn(row: unknown[], pattern: RegExp) {
	return row.findIndex((cell) => pattern.test(key(cell)));
}

function childName(row: unknown[], nameColumn: number, unitColumn: number) {
	for (let column = nameColumn; column < unitColumn; column += 1) {
		const value = text(row[column]);
		if (value && key(value) !== "kopā") return value.replace(/^-+\s*/, "");
	}
	return "";
}

function childKind(row: unknown[], nameColumn: number): Forma2PositionKind {
	const work = nonNegative(row[nameColumn + 6]);
	const material = nonNegative(row[nameColumn + 7]);
	const mechanism = nonNegative(row[nameColumn + 8]);
	if (material >= work && material >= mechanism && material > 0)
		return "material";
	if (mechanism >= work && mechanism > 0) return "mechanism";
	return "work";
}

export function extractForma2PositionsFromRows(
	rows: unknown[][],
	sheetName: string,
): ParsedForma2Sheet {
	const warnings: string[] = [];
	const headerRowIndex = findHeaderRow(rows);
	if (headerRowIndex < 0) {
		return {
			sheetName,
			positions: [],
			warnings: ["Forma 2 position headers were not found."],
		};
	}

	const header = rows[headerRowIndex] ?? [];
	const codeColumn = findColumn(header, /nr\.?p\.?k\.?/);
	const headerNameColumn = findColumn(header, /būvdarbu nosaukums/);
	const unitColumn = findColumn(header, /mērvienība/);
	const quantityColumn = findColumn(header, /^daudzums$/);
	const normColumn = findColumn(header, /laika norma/);
	const hourlyRateColumn = findColumn(header, /stundas likme/);

	if (
		codeColumn < 0 ||
		headerNameColumn < 0 ||
		unitColumn < 0 ||
		quantityColumn < 0
	) {
		return {
			sheetName,
			positions: [],
			warnings: ["Required Forma 2 columns could not be identified."],
		};
	}
	const nameColumn = codeColumn + 1;

	const positions: Forma2Position[] = [];
	let currentCategoryCode = "";
	let currentCategoryName = "";
	let currentParentId: string | null = null;
	let currentParentCode = "";

	for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
		const row = rows[index] ?? [];
		const code = positionCode(row[codeColumn]);
		const category = categoryCode(row[codeColumn]);
		const primaryName = text(row[nameColumn]);
		const unit = text(row[unitColumn]);
		const quantity = numberOrNull(row[quantityColumn]);

		if (category && primaryName && !unit && quantity == null) {
			currentCategoryCode = category;
			currentCategoryName = primaryName;
			currentParentId = null;
			currentParentCode = "";
			continue;
		}

		if (code && primaryName && unit) {
			const sourceRow = index + 1;
			const id = createForma2PositionId({
				kind: "work",
				code,
				name: primaryName,
				sourceRow,
			});
			const plannedWorkCost = nonNegative(row[nameColumn + 11]);
			const plannedMaterialCost = nonNegative(row[nameColumn + 12]);
			const plannedMechanismCost = nonNegative(row[nameColumn + 13]);
			const componentTotal =
				plannedWorkCost + plannedMaterialCost + plannedMechanismCost;
			positions.push({
				id,
				code,
				categoryCode: currentCategoryCode,
				categoryName: currentCategoryName,
				name: primaryName,
				kind: "work",
				parentId: null,
				sourceRow,
				unit,
				plannedQuantity: quantity,
				laborNormHoursPerUnit:
					normColumn >= 0 ? numberOrNull(row[normColumn]) : null,
				hourlyRate:
					hourlyRateColumn >= 0 ? numberOrNull(row[hourlyRateColumn]) : null,
				plannedWorkCost,
				plannedMaterialCost,
				plannedMechanismCost,
				plannedTotalCost: nonNegative(row[nameColumn + 14]) || componentTotal,
			});
			currentParentId = id;
			currentParentCode = code;
			continue;
		}

		const nestedName = childName(row, nameColumn, unitColumn);
		if (!currentParentId || !nestedName || !unit || quantity == null) continue;

		const kind = childKind(row, nameColumn);
		const sourceRow = index + 1;
		const plannedWorkCost = nonNegative(row[nameColumn + 11]);
		const plannedMaterialCost = nonNegative(row[nameColumn + 12]);
		const plannedMechanismCost = nonNegative(row[nameColumn + 13]);
		const componentTotal =
			plannedWorkCost + plannedMaterialCost + plannedMechanismCost;
		positions.push({
			id: createForma2PositionId({
				kind,
				code: currentParentCode,
				name: nestedName,
				sourceRow,
			}),
			code: "",
			categoryCode: currentCategoryCode,
			categoryName: currentCategoryName,
			name: nestedName,
			kind,
			parentId: currentParentId,
			sourceRow,
			unit,
			plannedQuantity: quantity,
			laborNormHoursPerUnit:
				normColumn >= 0 ? numberOrNull(row[normColumn]) : null,
			hourlyRate:
				hourlyRateColumn >= 0 ? numberOrNull(row[hourlyRateColumn]) : null,
			plannedWorkCost,
			plannedMaterialCost,
			plannedMechanismCost,
			plannedTotalCost: nonNegative(row[nameColumn + 14]) || componentTotal,
		});
	}

	if (!positions.length)
		warnings.push("No individual Forma 2 positions were found.");
	return { sheetName, positions, warnings };
}

export async function parseForma2Workbook(buffer: ArrayBuffer) {
	const XLSX = await import("xlsx");
	const workbook = XLSX.read(buffer, { type: "array" });
	return workbook.SheetNames.map((sheetName) => {
		const rows = XLSX.utils.sheet_to_json<unknown[]>(
			workbook.Sheets[sheetName],
			{
				header: 1,
				defval: null,
				raw: false,
			},
		);
		return extractForma2PositionsFromRows(rows, sheetName);
	}).filter((sheet) => sheet.positions.length > 0);
}

function tokens(value: string) {
	return new Set(
		key(value)
			.replace(/^\d+(?:\.\d+)+\s*/, "")
			.replace(/[^\p{L}\p{N}]+/gu, " ")
			.split(" ")
			.filter((token) => token.length > 2),
	);
}

function similarity(left: string, right: string) {
	const leftTokens = tokens(left);
	const rightTokens = tokens(right);
	if (!leftTokens.size || !rightTokens.size) return 0;
	let intersection = 0;
	leftTokens.forEach((token) => {
		if (rightTokens.has(token)) intersection += 1;
	});
	return intersection / (leftTokens.size + rightTokens.size - intersection);
}

function sourceCode(label: string) {
	return text(label).match(/^(\d+(?:\.\d+)+)\b/)?.[1] ?? "";
}

export function suggestForma2Position(
	source: Forma2ActualSource,
	positions: Forma2Position[],
) {
	const compatibleKind = source.type === "work" ? "work" : "material";
	const candidates = positions.filter(
		(position) => position.kind === compatibleKind,
	);
	const code = sourceCode(source.label);
	let best:
		| {
				positionId: string;
				confidence: number;
				reason: "code" | "name" | "similarity";
		  }
		| undefined;

	for (const position of candidates) {
		let confidence = 0;
		let reason: "code" | "name" | "similarity" = "similarity";
		if (code && position.code === code) {
			confidence = 1;
			reason = "code";
		} else if (key(source.label) === key(position.name)) {
			confidence = 0.99;
			reason = "name";
		} else {
			confidence = similarity(source.label, position.name);
			const sourceName = key(source.label);
			const positionName = key(position.name);
			if (
				Math.min(sourceName.length, positionName.length) >= 8 &&
				(sourceName.includes(positionName) || positionName.includes(sourceName))
			) {
				confidence = Math.max(confidence, 0.9);
				reason = "name";
			}
			if (source.unit && position.unit) {
				confidence += key(source.unit) === key(position.unit) ? 0.08 : -0.08;
			}
			confidence = Math.max(0, Math.min(0.98, confidence));
		}

		if (!best || confidence > best.confidence) {
			best = { positionId: position.id, confidence: round(confidence), reason };
		}
	}

	return best && best.confidence >= 0.3 ? best : null;
}

export function emptyDefaultConstructionForma2State() {
	return structuredClone(EMPTY_STATE);
}

export function normalizeDefaultConstructionForma2State(
	value: unknown,
): DefaultConstructionForma2State {
	const raw =
		value && typeof value === "object"
			? (value as Record<string, unknown>)
			: {};
	const document =
		raw.document && typeof raw.document === "object"
			? (raw.document as Record<string, unknown>)
			: null;
	const positions = Array.isArray(document?.positions)
		? document.positions.filter(
				(position: unknown) => position && typeof position === "object",
			)
		: [];
	const allocations = Array.isArray(raw.allocations)
		? raw.allocations.filter(
				(allocation: unknown) => allocation && typeof allocation === "object",
			)
		: [];
	const materialRules = Array.isArray(raw.materialRules)
		? raw.materialRules.filter(
				(rule: unknown) => rule && typeof rule === "object",
			)
		: [];

	if (!document) return emptyDefaultConstructionForma2State();
	return {
		version: 1,
		document: {
			id: text(document.id),
			fileName: text(document.fileName),
			sheetName: text(document.sheetName),
			importedAt: text(document.importedAt),
			positions: positions as Forma2Position[],
		},
		allocations: allocations as Forma2Allocation[],
		materialRules: materialRules as Forma2MaterialRule[],
	};
}

export function buildForma2AnalyticsView(args: {
	positions: Forma2Position[];
	sources: Forma2ActualSource[];
	allocations: Forma2Allocation[];
	includeSuggestions?: boolean;
}): Forma2AnalyticsView {
	const positionsById = new Map(
		args.positions.map((position) => [position.id, position]),
	);
	const allocationsBySource = new Map(
		args.allocations
			.filter((allocation) => positionsById.has(allocation.positionId))
			.map((allocation) => [
				`${allocation.sourceType}:${allocation.sourceId}`,
				allocation,
			]),
	);
	const mappingRows = args.sources.map((source) => {
		const allocation = allocationsBySource.get(`${source.type}:${source.id}`);
		const suggestion =
			allocation || args.includeSuggestions === false
				? null
				: suggestForma2Position(source, args.positions);
		return {
			...source,
			assignedPositionId: allocation?.positionId ?? null,
			suggestedPositionId: suggestion?.positionId ?? null,
			suggestionConfidence: suggestion?.confidence ?? null,
			suggestionReason: suggestion?.reason ?? null,
		};
	});

	const directTotals = new Map<
		string,
		{ work: number; material: number; mechanism: number; records: number }
	>();
	mappingRows.forEach((source) => {
		if (!source.assignedPositionId) return;
		const current = directTotals.get(source.assignedPositionId) ?? {
			work: 0,
			material: 0,
			mechanism: 0,
			records: 0,
		};
		if (source.actualCost != null) current[source.type] += source.actualCost;
		current.records += 1;
		directTotals.set(source.assignedPositionId, current);
	});

	const childrenByParent = new Map<string, Forma2Position[]>();
	args.positions.forEach((position) => {
		if (!position.parentId) return;
		childrenByParent.set(position.parentId, [
			...(childrenByParent.get(position.parentId) ?? []),
			position,
		]);
	});

	const totalsFor = (position: Forma2Position) => {
		const direct = directTotals.get(position.id) ?? {
			work: 0,
			material: 0,
			mechanism: 0,
			records: 0,
		};
		const children = childrenByParent.get(position.id) ?? [];
		return children.reduce(
			(total, child) => {
				const childTotal = directTotals.get(child.id);
				if (!childTotal) return total;
				total.work += childTotal.work;
				total.material += childTotal.material;
				total.mechanism += childTotal.mechanism;
				total.records += childTotal.records;
				return total;
			},
			{ ...direct },
		);
	};

	const resultRows = args.positions.map((position) => {
		const actual = totalsFor(position);
		const actualTotalCost = actual.work + actual.material + actual.mechanism;
		return {
			...position,
			actualWorkCost: round(actual.work),
			actualMaterialCost: round(actual.material),
			actualMechanismCost: round(actual.mechanism),
			actualTotalCost: round(actualTotalCost),
			variance: round(position.plannedTotalCost - actualTotalCost),
			assignedRecords: actual.records,
		};
	});

	const assignedRows = mappingRows.filter((row) => row.assignedPositionId);
	const pricedRows = mappingRows.filter((row) => row.actualCost != null);
	const factualCost = pricedRows.reduce(
		(sum, row) => sum + Number(row.actualCost ?? 0),
		0,
	);
	const assignedCost = assignedRows.reduce(
		(sum, row) => sum + Number(row.actualCost ?? 0),
		0,
	);
	const plannedCost = args.positions
		.filter((position) => !position.parentId)
		.reduce((sum, position) => sum + position.plannedTotalCost, 0);

	return {
		summary: {
			positions: args.positions.length,
			factualRecords: mappingRows.length,
			assignedRecords: assignedRows.length,
			unassignedRecords: mappingRows.length - assignedRows.length,
			pricedRecords: pricedRows.length,
			unpricedRecords: mappingRows.length - pricedRows.length,
			plannedCost: round(plannedCost),
			factualCost: round(factualCost),
			assignedCost: round(assignedCost),
			unassignedCost: round(factualCost - assignedCost),
			variance: round(plannedCost - assignedCost),
		},
		mappingRows,
		resultRows,
	};
}
