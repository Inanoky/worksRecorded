import { Prisma } from "@prisma/client";

export const TGEM_INVOICE_SPLIT_KINDS = ["allocated", "residual"] as const;

export type TgemInvoiceSplitKind = (typeof TGEM_INVOICE_SPLIT_KINDS)[number];

export type TgemInvoiceSplitSourceLine = {
	id: string;
	lineNumber: number;
	description: string | null;
	quantity: string | null;
	unit: string | null;
	unitPrice: string | null;
	total: string | null;
	currency: string | null;
	costCode: string | null;
	category: string | null;
	suggestedProjectId: string | null;
	suggestedCostCode: string | null;
	suggestedCategory: string | null;
	aiConfidence: number | null;
	sourceText: string | null;
};

export type TgemInvoiceSplitLineRequest = {
	lineId: string;
	correctedSourceQuantity?: string | null;
	wholeProjectId?: string | null;
	allocations?: Array<{
		projectId: string;
		quantity: string;
	}>;
	percentageAllocations?: Array<{
		projectId: string;
		percentage: string;
	}>;
};

export type TgemInvoiceSplitPercentageAllocation = {
	projectId: string;
	percentage: string;
};

export type TgemInvoiceSplitCalculationInput = {
	currency: string | null;
	subtotal: string | null;
	vat: string | null;
	total: string | null;
	destinationProjectIds: string[];
	residualProjectId: string | null;
	lines: TgemInvoiceSplitSourceLine[];
	lineRequests: TgemInvoiceSplitLineRequest[];
	invoicePercentageAllocations?: TgemInvoiceSplitPercentageAllocation[];
};

export type TgemInvoiceSplitCalculatedLine = Omit<
	TgemInvoiceSplitSourceLine,
	"id"
> & {
	sourceLineId: string;
};

export type TgemInvoiceSplitCalculatedCase = {
	projectId: string;
	kind: TgemInvoiceSplitKind;
	lines: TgemInvoiceSplitCalculatedLine[];
	lineSum: string;
	subtotalAdjustment: string | null;
	subtotal: string | null;
	vat: string | null;
	total: string | null;
};

export type TgemInvoiceSplitCalculationResult = {
	currency: string | null;
	currencyMinorUnits: number;
	hasResidual: boolean;
	quantityCorrections: Array<{
		sourceLineId: string;
		correctedQuantity: string;
	}>;
	cases: TgemInvoiceSplitCalculatedCase[];
};

export type TgemInvoiceSplitCalculationErrorCode =
	| "allocation_exceeds_quantity"
	| "corrected_quantity_not_allowed"
	| "currency_mismatch"
	| "destination_required"
	| "destination_has_no_allocation"
	| "duplicate_destination"
	| "duplicate_line"
	| "duplicate_line_allocation"
	| "duplicate_line_request"
	| "full_split_requires_multiple_projects"
	| "invalid_currency"
	| "invalid_money"
	| "invalid_money_precision"
	| "invalid_percentage"
	| "invalid_percentage_precision"
	| "invalid_quantity"
	| "irreconcilable_headers"
	| "monetary_basis_required"
	| "percentage_exceeds_100"
	| "percentage_mode_conflict"
	| "residual_matches_destination"
	| "residual_project_required"
	| "source_quantity_required"
	| "unknown_destination"
	| "unknown_line"
	| "whole_line_conflict";

export class TgemInvoiceSplitCalculationError extends Error {
	readonly code: TgemInvoiceSplitCalculationErrorCode;
	readonly lineId: string | null;
	readonly projectId: string | null;

	constructor(
		code: TgemInvoiceSplitCalculationErrorCode,
		options?: { lineId?: string; projectId?: string },
	) {
		super(code);
		this.name = "TgemInvoiceSplitCalculationError";
		this.code = code;
		this.lineId = options?.lineId ?? null;
		this.projectId = options?.projectId ?? null;
	}
}

type Decimal = Prisma.Decimal;

type WorkingLine = {
	line: TgemInvoiceSplitCalculatedLine;
	basis: Decimal;
};

type WorkingCase = {
	projectId: string;
	kind: TgemInvoiceSplitKind;
	lines: WorkingLine[];
};

function fail(
	code: TgemInvoiceSplitCalculationErrorCode,
	options?: { lineId?: string; projectId?: string },
): never {
	throw new TgemInvoiceSplitCalculationError(code, options);
}

function decimal(
	value: string,
	code: "invalid_money" | "invalid_percentage" | "invalid_quantity",
	options?: { lineId?: string; projectId?: string },
) {
	try {
		const parsed = new Prisma.Decimal(value);
		if (!parsed.isFinite()) return fail(code, options);
		return parsed;
	} catch {
		return fail(code, options);
	}
}

function optionalMoney(value: string | null, lineId?: string) {
	return value === null
		? null
		: decimal(value, "invalid_money", lineId ? { lineId } : undefined);
}

function normalizeCurrency(value: string) {
	const currency = value.trim().toUpperCase();
	if (!/^[A-Z]{3}$/.test(currency)) fail("invalid_currency");
	return currency;
}

export function getTgemCurrencyMinorUnits(currency: string): number {
	const normalized = normalizeCurrency(currency);
	try {
		const minorUnits = new Intl.NumberFormat("en", {
			style: "currency",
			currency: normalized,
		}).resolvedOptions().maximumFractionDigits;
		if (minorUnits === undefined) fail("invalid_currency");
		return minorUnits;
	} catch {
		return fail("invalid_currency");
	}
}

function minorUnit(scale: number) {
	return new Prisma.Decimal(10).pow(scale);
}

function assertMoneyPrecision(value: Decimal, scale: number, lineId?: string) {
	if (!value.eq(value.toDecimalPlaces(scale, Prisma.Decimal.ROUND_HALF_UP))) {
		fail("invalid_money_precision", lineId ? { lineId } : undefined);
	}
}

function percentage(
	value: string,
	options?: { lineId?: string; projectId?: string },
) {
	const normalized = value.trim();
	if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
		fail("invalid_percentage", options);
	}
	if ((normalized.split(".")[1]?.length ?? 0) > 2) {
		fail("invalid_percentage_precision", options);
	}
	const parsed = decimal(normalized, "invalid_percentage", options);
	if (!parsed.greaterThan(0) || parsed.greaterThan(100)) {
		fail("invalid_percentage", options);
	}
	return parsed;
}

function formatMoney(value: Decimal, scale: number) {
	return value
		.toDecimalPlaces(scale, Prisma.Decimal.ROUND_HALF_UP)
		.toFixed(scale);
}

function roundedMoney(value: Decimal | null, scale: number) {
	return value?.toDecimalPlaces(scale, Prisma.Decimal.ROUND_HALF_UP) ?? null;
}

function formatQuantity(value: Decimal) {
	return value.toString();
}

function sum(values: Decimal[]) {
	return values.reduce(
		(total, value) => total.plus(value),
		new Prisma.Decimal(0),
	);
}

function allocateMoney(total: Decimal, weights: Decimal[], scale: number) {
	assertMoneyPrecision(total, scale);
	const absoluteWeights = weights.map((weight) => weight.abs());
	const weightTotal = sum(absoluteWeights);
	if (weightTotal.isZero()) {
		if (!total.isZero()) fail("monetary_basis_required");
		return weights.map(() => new Prisma.Decimal(0));
	}

	const factor = minorUnit(scale);
	const absoluteUnits = total.abs().times(factor);
	const shares = absoluteWeights.map((weight) =>
		absoluteUnits.times(weight).dividedBy(weightTotal),
	);
	const allocatedUnits = shares.map((share) => share.floor());
	const remainder = absoluteUnits.minus(sum(allocatedUnits));
	const remainderCount = Number(remainder.toFixed(0));
	const rankedIndexes = shares
		.map((share, index) => ({
			fraction: share.minus(allocatedUnits[index]),
			index,
		}))
		.sort(
			(left, right) =>
				right.fraction.comparedTo(left.fraction) || left.index - right.index,
		);

	for (let index = 0; index < remainderCount; index += 1) {
		const target = rankedIndexes[index]?.index;
		if (target === undefined) fail("invalid_money");
		allocatedUnits[target] = allocatedUnits[target].plus(1);
	}

	const sign = total.isNegative() ? -1 : 1;
	return allocatedUnits.map((units) => units.times(sign).dividedBy(factor));
}

function monetaryBasis(
	lineTotal: Decimal | null,
	quantity: Decimal | null,
	unitPrice: Decimal | null,
) {
	if (lineTotal !== null) return lineTotal.abs();
	if (quantity !== null && unitPrice !== null) {
		return quantity.times(unitPrice).abs();
	}
	return null;
}

function calculatedLine(
	line: TgemInvoiceSplitSourceLine,
	quantity: Decimal | null,
	total: Decimal | null,
	minorUnits: number,
): TgemInvoiceSplitCalculatedLine {
	return {
		sourceLineId: line.id,
		lineNumber: line.lineNumber,
		description: line.description,
		quantity: quantity === null ? null : formatQuantity(quantity),
		unit: line.unit,
		unitPrice: line.unitPrice,
		total: total === null ? null : formatMoney(total, minorUnits),
		currency: line.currency,
		costCode: line.costCode,
		category: line.category,
		suggestedProjectId: line.suggestedProjectId,
		suggestedCostCode: line.suggestedCostCode,
		suggestedCategory: line.suggestedCategory,
		aiConfidence: line.aiConfidence,
		sourceText: line.sourceText,
	};
}

function validateAndResolveCurrency(input: TgemInvoiceSplitCalculationInput) {
	const currencies = new Set<string>();
	if (input.currency) currencies.add(normalizeCurrency(input.currency));
	let hasMoney =
		input.subtotal !== null || input.vat !== null || input.total !== null;

	for (const line of input.lines) {
		if (line.total !== null || line.unitPrice !== null) {
			hasMoney = true;
			if (line.currency) currencies.add(normalizeCurrency(line.currency));
		}
	}

	if (currencies.size > 1) fail("currency_mismatch");
	const currency = currencies.values().next().value as string | undefined;
	if (hasMoney && !currency) fail("invalid_currency");
	return currency ?? null;
}

function validateHeaders(
	input: TgemInvoiceSplitCalculationInput,
	minorUnits: number,
) {
	const subtotal = roundedMoney(optionalMoney(input.subtotal), minorUnits);
	const vat = roundedMoney(optionalMoney(input.vat), minorUnits);
	const total = roundedMoney(optionalMoney(input.total), minorUnits);

	if (subtotal !== null && vat !== null && total !== null) {
		const difference = subtotal.plus(vat).minus(total).abs();
		if (
			difference.greaterThan(new Prisma.Decimal(1).div(minorUnit(minorUnits)))
		) {
			fail("irreconcilable_headers");
		}
	}

	return { subtotal, vat, total };
}

export function calculateTgemInvoiceSplit(
	input: TgemInvoiceSplitCalculationInput,
): TgemInvoiceSplitCalculationResult {
	const destinationProjectIds = input.destinationProjectIds.map((projectId) =>
		projectId.trim(),
	);
	if (destinationProjectIds.length === 0) fail("destination_required");
	if (
		destinationProjectIds.some((projectId) => !projectId) ||
		new Set(destinationProjectIds).size !== destinationProjectIds.length
	) {
		fail("duplicate_destination");
	}
	const destinationSet = new Set(destinationProjectIds);
	const residualProjectId = input.residualProjectId?.trim() || null;
	if (residualProjectId && destinationSet.has(residualProjectId)) {
		fail("residual_matches_destination", { projectId: residualProjectId });
	}

	const currency = validateAndResolveCurrency(input);
	const currencyMinorUnits = currency ? getTgemCurrencyMinorUnits(currency) : 2;
	const headers = validateHeaders(input, currencyMinorUnits);
	const linesById = new Map<string, TgemInvoiceSplitSourceLine>();
	for (const line of input.lines) {
		if (linesById.has(line.id)) fail("duplicate_line", { lineId: line.id });
		linesById.set(line.id, line);
		optionalMoney(line.total, line.id);
		if (
			line.currency &&
			(line.total !== null || line.unitPrice !== null) &&
			currency &&
			normalizeCurrency(line.currency) !== currency
		) {
			fail("currency_mismatch", { lineId: line.id });
		}
	}

	const requestsByLineId = new Map<string, TgemInvoiceSplitLineRequest>();
	for (const request of input.lineRequests) {
		if (requestsByLineId.has(request.lineId)) {
			fail("duplicate_line_request", { lineId: request.lineId });
		}
		if (!linesById.has(request.lineId)) {
			fail("unknown_line", { lineId: request.lineId });
		}
		requestsByLineId.set(request.lineId, request);
	}
	const invoicePercentageAllocations = input.invoicePercentageAllocations ?? [];
	if (
		invoicePercentageAllocations.length > 0 &&
		input.lineRequests.length > 0
	) {
		fail("percentage_mode_conflict");
	}

	const workingCases = new Map<string, WorkingCase>();
	for (const projectId of destinationProjectIds) {
		workingCases.set(projectId, {
			projectId,
			kind: "allocated",
			lines: [],
		});
	}
	const residualKey = "\u0000residual";
	const quantityCorrections: TgemInvoiceSplitCalculationResult["quantityCorrections"] =
		[];

	const addLine = (
		caseKey: string,
		line: TgemInvoiceSplitSourceLine,
		quantity: Decimal | null,
		total: Decimal | null,
		basis: Decimal,
	) => {
		if (!workingCases.has(caseKey)) {
			if (caseKey !== residualKey || !residualProjectId) {
				fail("residual_project_required");
			}
			workingCases.set(caseKey, {
				projectId: residualProjectId,
				kind: "residual",
				lines: [],
			});
		}
		workingCases.get(caseKey)?.lines.push({
			line: calculatedLine(line, quantity, total, currencyMinorUnits),
			basis: basis.abs(),
		});
	};

	for (const line of input.lines) {
		const request = requestsByLineId.get(line.id);
		const allocations = request?.allocations ?? [];
		const percentageAllocations =
			invoicePercentageAllocations.length > 0
				? invoicePercentageAllocations
				: (request?.percentageAllocations ?? []);
		const wholeProjectId = request?.wholeProjectId?.trim() || null;
		const correctedSourceQuantity =
			request?.correctedSourceQuantity?.trim() || null;
		if (
			(wholeProjectId &&
				(allocations.length > 0 || percentageAllocations.length > 0)) ||
			(allocations.length > 0 && percentageAllocations.length > 0)
		) {
			fail("whole_line_conflict", { lineId: line.id });
		}
		if (wholeProjectId && !destinationSet.has(wholeProjectId)) {
			fail("unknown_destination", {
				lineId: line.id,
				projectId: wholeProjectId,
			});
		}
		if (
			correctedSourceQuantity &&
			(line.quantity !== null || allocations.length === 0)
		) {
			fail("corrected_quantity_not_allowed", { lineId: line.id });
		}

		const sourceLineTotal = roundedMoney(
			optionalMoney(line.total, line.id),
			currencyMinorUnits,
		);
		const unitPrice = optionalMoney(line.unitPrice, line.id);
		const extractedQuantity =
			line.quantity === null
				? null
				: decimal(line.quantity, "invalid_quantity", { lineId: line.id });
		if (extractedQuantity?.isNegative()) {
			fail("invalid_quantity", { lineId: line.id });
		}

		if (wholeProjectId) {
			const basis =
				monetaryBasis(sourceLineTotal, extractedQuantity, unitPrice) ??
				new Prisma.Decimal(0);
			addLine(wholeProjectId, line, extractedQuantity, sourceLineTotal, basis);
			continue;
		}

		if (percentageAllocations.length > 0) {
			const seenProjects = new Set<string>();
			const parsedPercentages = percentageAllocations.map((allocation) => {
				const projectId = allocation.projectId.trim();
				if (!destinationSet.has(projectId)) {
					fail("unknown_destination", { lineId: line.id, projectId });
				}
				if (seenProjects.has(projectId)) {
					fail("duplicate_line_allocation", { lineId: line.id, projectId });
				}
				seenProjects.add(projectId);
				return {
					projectId,
					percentage: percentage(allocation.percentage, {
						lineId: line.id,
						projectId,
					}),
				};
			});
			parsedPercentages.sort(
				(left, right) =>
					destinationProjectIds.indexOf(left.projectId) -
					destinationProjectIds.indexOf(right.projectId),
			);
			const allocatedPercentage = sum(
				parsedPercentages.map((allocation) => allocation.percentage),
			);
			if (allocatedPercentage.greaterThan(100)) {
				fail("percentage_exceeds_100", { lineId: line.id });
			}
			const residualPercentage = new Prisma.Decimal(100).minus(
				allocatedPercentage,
			);
			const basisTotal =
				monetaryBasis(sourceLineTotal, extractedQuantity, unitPrice) ??
				new Prisma.Decimal(1);
			const percentageShares = parsedPercentages.map(
				(allocation) => allocation.percentage,
			);
			if (residualPercentage.greaterThan(0)) {
				percentageShares.push(residualPercentage);
			}
			const totalShares = sourceLineTotal
				? allocateMoney(sourceLineTotal, percentageShares, currencyMinorUnits)
				: percentageShares.map(() => null);

			for (const [index, allocation] of parsedPercentages.entries()) {
				addLine(
					allocation.projectId,
					line,
					extractedQuantity
						? extractedQuantity.times(allocation.percentage).dividedBy(100)
						: null,
					totalShares[index],
					basisTotal.times(allocation.percentage).dividedBy(100),
				);
			}
			if (residualPercentage.greaterThan(0)) {
				addLine(
					residualKey,
					line,
					extractedQuantity
						? extractedQuantity.times(residualPercentage).dividedBy(100)
						: null,
					totalShares[totalShares.length - 1],
					basisTotal.times(residualPercentage).dividedBy(100),
				);
			}
			continue;
		}

		if (allocations.length === 0) {
			const basis =
				monetaryBasis(sourceLineTotal, extractedQuantity, unitPrice) ??
				new Prisma.Decimal(0);
			addLine(residualKey, line, extractedQuantity, sourceLineTotal, basis);
			continue;
		}

		const sourceQuantity =
			extractedQuantity ??
			(correctedSourceQuantity
				? decimal(correctedSourceQuantity, "invalid_quantity", {
						lineId: line.id,
					})
				: fail("source_quantity_required", { lineId: line.id }));
		if (!sourceQuantity.greaterThan(0)) {
			fail("invalid_quantity", { lineId: line.id });
		}
		if (correctedSourceQuantity) {
			quantityCorrections.push({
				sourceLineId: line.id,
				correctedQuantity: formatQuantity(sourceQuantity),
			});
		}

		const seenProjects = new Set<string>();
		const parsedAllocations = allocations.map((allocation) => {
			const projectId = allocation.projectId.trim();
			if (!destinationSet.has(projectId)) {
				fail("unknown_destination", { lineId: line.id, projectId });
			}
			if (seenProjects.has(projectId)) {
				fail("duplicate_line_allocation", {
					lineId: line.id,
					projectId,
				});
			}
			seenProjects.add(projectId);
			const quantity = decimal(allocation.quantity, "invalid_quantity", {
				lineId: line.id,
				projectId,
			});
			if (!quantity.greaterThan(0)) {
				fail("invalid_quantity", { lineId: line.id, projectId });
			}
			return { projectId, quantity };
		});
		parsedAllocations.sort(
			(left, right) =>
				destinationProjectIds.indexOf(left.projectId) -
				destinationProjectIds.indexOf(right.projectId),
		);
		const allocatedQuantity = sum(
			parsedAllocations.map((allocation) => allocation.quantity),
		);
		if (allocatedQuantity.greaterThan(sourceQuantity)) {
			fail("allocation_exceeds_quantity", { lineId: line.id });
		}
		const residualQuantity = sourceQuantity.minus(allocatedQuantity);
		const basisTotal = monetaryBasis(
			sourceLineTotal,
			sourceQuantity,
			unitPrice,
		);
		if (basisTotal === null) {
			fail("monetary_basis_required", { lineId: line.id });
		}

		const quantityShares = parsedAllocations.map(
			(allocation) => allocation.quantity,
		);
		if (residualQuantity.greaterThan(0)) quantityShares.push(residualQuantity);
		const totalShares = sourceLineTotal
			? allocateMoney(sourceLineTotal, quantityShares, currencyMinorUnits)
			: quantityShares.map(() => null);

		for (const [index, allocation] of parsedAllocations.entries()) {
			const basis = basisTotal
				.times(allocation.quantity)
				.dividedBy(sourceQuantity);
			addLine(
				allocation.projectId,
				line,
				allocation.quantity,
				totalShares[index],
				basis,
			);
		}
		if (residualQuantity.greaterThan(0)) {
			const basis = basisTotal
				.times(residualQuantity)
				.dividedBy(sourceQuantity);
			addLine(
				residualKey,
				line,
				residualQuantity,
				totalShares[totalShares.length - 1],
				basis,
			);
		}
	}

	for (const projectId of destinationProjectIds) {
		if (workingCases.get(projectId)?.lines.length === 0) {
			fail("destination_has_no_allocation", { projectId });
		}
	}
	const hasResidual = workingCases.has(residualKey);
	if (!hasResidual && destinationProjectIds.length < 2) {
		fail("full_split_requires_multiple_projects");
	}

	const orderedCases = [
		...destinationProjectIds.map((projectId) => workingCases.get(projectId)),
		...(hasResidual ? [workingCases.get(residualKey)] : []),
	].filter((entry): entry is WorkingCase => Boolean(entry));
	const caseWeights = orderedCases.map((entry) =>
		sum(entry.lines.map((line) => line.basis)),
	);
	const sourceLineSum = sum(
		input.lines.flatMap((line) => {
			const total = roundedMoney(
				optionalMoney(line.total, line.id),
				currencyMinorUnits,
			);
			return total === null ? [] : [total];
		}),
	);
	const caseLineSums = orderedCases.map((entry) =>
		sum(
			entry.lines.flatMap(({ line }) =>
				line.total === null
					? []
					: [
							decimal(line.total, "invalid_money", {
								lineId: line.sourceLineId,
							}),
						],
			),
		),
	);
	const subtotalAdjustments = headers.subtotal
		? allocateMoney(
				headers.subtotal.minus(sourceLineSum),
				caseWeights,
				currencyMinorUnits,
			)
		: orderedCases.map(() => null);
	const caseSubtotals = orderedCases.map((_, index) =>
		headers.subtotal
			? caseLineSums[index].plus(subtotalAdjustments[index] ?? 0)
			: null,
	);
	const headerWeights =
		invoicePercentageAllocations.length > 0
			? caseWeights
			: caseSubtotals.map(
					(subtotal, index) => subtotal?.abs() ?? caseWeights[index],
				);
	const caseVat = headers.vat
		? allocateMoney(headers.vat, headerWeights, currencyMinorUnits)
		: orderedCases.map(() => null);
	const caseTotals = headers.total
		? allocateMoney(headers.total, headerWeights, currencyMinorUnits)
		: orderedCases.map(() => null);

	return {
		currency,
		currencyMinorUnits,
		hasResidual,
		quantityCorrections,
		cases: orderedCases.map((entry, index) => ({
			projectId: entry.projectId,
			kind: entry.kind,
			lines: entry.lines.map(({ line }) => line),
			lineSum: formatMoney(caseLineSums[index], currencyMinorUnits),
			subtotalAdjustment:
				subtotalAdjustments[index] === null
					? null
					: formatMoney(
							subtotalAdjustments[index] as Decimal,
							currencyMinorUnits,
						),
			subtotal:
				caseSubtotals[index] === null
					? null
					: formatMoney(caseSubtotals[index] as Decimal, currencyMinorUnits),
			vat:
				caseVat[index] === null
					? null
					: formatMoney(caseVat[index] as Decimal, currencyMinorUnits),
			total:
				caseTotals[index] === null
					? null
					: formatMoney(caseTotals[index] as Decimal, currencyMinorUnits),
		})),
	};
}
