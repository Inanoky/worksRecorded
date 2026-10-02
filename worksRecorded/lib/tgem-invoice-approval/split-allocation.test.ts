import {
	calculateTgemInvoiceSplit,
	getTgemCurrencyMinorUnits,
	TgemInvoiceSplitCalculationError,
	type TgemInvoiceSplitCalculationErrorCode,
	type TgemInvoiceSplitCalculationInput,
	type TgemInvoiceSplitSourceLine,
} from "@/lib/tgem-invoice-approval/split-allocation";

function sourceLine(
	overrides: Partial<TgemInvoiceSplitSourceLine> &
		Pick<TgemInvoiceSplitSourceLine, "id" | "lineNumber">,
): TgemInvoiceSplitSourceLine {
	return {
		description: `Line ${overrides.lineNumber}`,
		quantity: null,
		unit: "gab.",
		unitPrice: null,
		total: null,
		currency: "EUR",
		costCode: null,
		category: null,
		suggestedProjectId: null,
		suggestedCostCode: null,
		suggestedCategory: null,
		aiConfidence: 0.99,
		sourceText: `Source ${overrides.lineNumber}`,
		...overrides,
	};
}

function calculationInput(
	overrides: Partial<TgemInvoiceSplitCalculationInput> = {},
): TgemInvoiceSplitCalculationInput {
	return {
		currency: "EUR",
		subtotal: "50.00",
		vat: "10.00",
		total: "60.00",
		destinationProjectIds: ["project-a"],
		residualProjectId: "project-original",
		lines: [
			sourceLine({
				id: "line-1",
				lineNumber: 1,
				quantity: "2",
				unitPrice: "10",
				total: "20.00",
			}),
			sourceLine({
				id: "line-2",
				lineNumber: 2,
				quantity: "3",
				unitPrice: "10",
				total: "30.00",
			}),
		],
		lineRequests: [],
		...overrides,
	};
}

function expectCalculationError(
	input: TgemInvoiceSplitCalculationInput,
	code: TgemInvoiceSplitCalculationErrorCode,
) {
	try {
		calculateTgemInvoiceSplit(input);
		throw new Error("Expected split calculation to fail");
	} catch (error) {
		expect(error).toBeInstanceOf(TgemInvoiceSplitCalculationError);
		expect((error as TgemInvoiceSplitCalculationError).code).toBe(code);
	}
}

describe("calculateTgemInvoiceSplit", () => {
	it("moves a whole row and leaves untouched rows in a residual invoice", () => {
		const result = calculateTgemInvoiceSplit(
			calculationInput({
				lineRequests: [{ lineId: "line-1", wholeProjectId: "project-a" }],
			}),
		);

		expect(result.hasResidual).toBe(true);
		expect(result.cases).toEqual([
			expect.objectContaining({
				projectId: "project-a",
				kind: "allocated",
				lineSum: "20.00",
				subtotalAdjustment: "0.00",
				subtotal: "20.00",
				vat: "4.00",
				total: "24.00",
				lines: [expect.objectContaining({ sourceLineId: "line-1" })],
			}),
			expect.objectContaining({
				projectId: "project-original",
				kind: "residual",
				lineSum: "30.00",
				subtotalAdjustment: "0.00",
				subtotal: "30.00",
				vat: "6.00",
				total: "36.00",
				lines: [expect.objectContaining({ sourceLineId: "line-2" })],
			}),
		]);
	});

	it("splits an extracted quantity across projects and retains the remainder", () => {
		const result = calculateTgemInvoiceSplit(
			calculationInput({
				subtotal: "100.00",
				vat: "21.00",
				total: "121.00",
				destinationProjectIds: ["project-a", "project-b"],
				lines: [
					sourceLine({
						id: "line-1",
						lineNumber: 1,
						quantity: "10",
						unitPrice: "10",
						total: "100.00",
					}),
				],
				lineRequests: [
					{
						lineId: "line-1",
						allocations: [
							{ projectId: "project-a", quantity: "3" },
							{ projectId: "project-b", quantity: "2" },
						],
					},
				],
			}),
		);

		expect(
			result.cases.map((invoice) => ({
				projectId: invoice.projectId,
				quantity: invoice.lines[0].quantity,
				lineTotal: invoice.lines[0].total,
				total: invoice.total,
			})),
		).toEqual([
			{
				projectId: "project-a",
				quantity: "3",
				lineTotal: "30.00",
				total: "36.30",
			},
			{
				projectId: "project-b",
				quantity: "2",
				lineTotal: "20.00",
				total: "24.20",
			},
			{
				projectId: "project-original",
				quantity: "5",
				lineTotal: "50.00",
				total: "60.50",
			},
		]);
	});

	it("uses an audited manual source count when extraction omitted quantity", () => {
		const result = calculateTgemInvoiceSplit(
			calculationInput({
				subtotal: "40.00",
				vat: "8.40",
				total: "48.40",
				lines: [
					sourceLine({
						id: "line-1",
						lineNumber: 1,
						quantity: null,
						unitPrice: "10",
						total: "40.00",
					}),
				],
				lineRequests: [
					{
						lineId: "line-1",
						correctedSourceQuantity: "4",
						allocations: [{ projectId: "project-a", quantity: "1" }],
					},
				],
			}),
		);

		expect(result.quantityCorrections).toEqual([
			{ sourceLineId: "line-1", correctedQuantity: "4" },
		]);
		expect(result.cases[0].lines[0]).toEqual(
			expect.objectContaining({ quantity: "1", total: "10.00" }),
		);
		expect(result.cases[1].lines[0]).toEqual(
			expect.objectContaining({ quantity: "3", total: "30.00" }),
		);
	});

	it("preserves decimal quantities exactly", () => {
		const result = calculateTgemInvoiceSplit(
			calculationInput({
				subtotal: "25.00",
				vat: "5.25",
				total: "30.25",
				lines: [
					sourceLine({
						id: "line-1",
						lineNumber: 1,
						quantity: "2.5",
						unitPrice: "10",
						total: "25.00",
					}),
				],
				lineRequests: [
					{
						lineId: "line-1",
						allocations: [{ projectId: "project-a", quantity: "0.75" }],
					},
				],
			}),
		);

		expect(result.cases[0].lines[0]).toEqual(
			expect.objectContaining({ quantity: "0.75", total: "7.50" }),
		);
		expect(result.cases[1].lines[0]).toEqual(
			expect.objectContaining({ quantity: "1.75", total: "17.50" }),
		);
	});

	it("distributes minor-unit rounding deterministically without a residual", () => {
		const result = calculateTgemInvoiceSplit(
			calculationInput({
				subtotal: "10.00",
				vat: "2.10",
				total: "12.10",
				destinationProjectIds: ["project-a", "project-b"],
				residualProjectId: null,
				lines: [
					sourceLine({
						id: "line-1",
						lineNumber: 1,
						quantity: "3",
						unitPrice: "3.333333",
						total: "10.00",
					}),
				],
				lineRequests: [
					{
						lineId: "line-1",
						allocations: [
							{ projectId: "project-a", quantity: "1" },
							{ projectId: "project-b", quantity: "2" },
						],
					},
				],
			}),
		);

		expect(result.hasResidual).toBe(false);
		expect(result.cases.map((invoice) => invoice.lines[0].total)).toEqual([
			"3.33",
			"6.67",
		]);
		expect(result.cases.map((invoice) => invoice.vat)).toEqual([
			"0.70",
			"1.40",
		]);
		expect(result.cases.map((invoice) => invoice.total)).toEqual([
			"4.03",
			"8.07",
		]);
	});

	it("rounds high-precision source money before splitting and preserves the rounded total", () => {
		const result = calculateTgemInvoiceSplit(
			calculationInput({
				subtotal: "10.005",
				vat: "2.101",
				total: "12.106",
				destinationProjectIds: ["project-a", "project-b"],
				residualProjectId: null,
				lines: [
					sourceLine({
						id: "line-1",
						lineNumber: 1,
						quantity: "2",
						unitPrice: "5.0025",
						total: "10.005",
					}),
				],
				lineRequests: [
					{
						lineId: "line-1",
						allocations: [
							{ projectId: "project-a", quantity: "1" },
							{ projectId: "project-b", quantity: "1" },
						],
					},
				],
			}),
		);

		expect(result.cases.map((invoice) => invoice.lines[0].total)).toEqual([
			"5.01",
			"5.00",
		]);
		expect(result.cases.map((invoice) => invoice.subtotal)).toEqual([
			"5.01",
			"5.00",
		]);
		expect(result.cases.map((invoice) => invoice.vat)).toEqual([
			"1.05",
			"1.05",
		]);
		expect(result.cases.map((invoice) => invoice.total)).toEqual([
			"6.06",
			"6.05",
		]);
	});

	it("allocates a line-to-subtotal mismatch transparently", () => {
		const result = calculateTgemInvoiceSplit(
			calculationInput({
				subtotal: "100.00",
				vat: "21.00",
				total: "121.00",
				lines: [
					sourceLine({
						id: "line-1",
						lineNumber: 1,
						quantity: "1",
						unitPrice: "60",
						total: "60.00",
					}),
					sourceLine({
						id: "line-2",
						lineNumber: 2,
						quantity: "1",
						unitPrice: "30",
						total: "30.00",
					}),
				],
				lineRequests: [{ lineId: "line-1", wholeProjectId: "project-a" }],
			}),
		);

		expect(
			result.cases.map((invoice) => ({
				adjustment: invoice.subtotalAdjustment,
				subtotal: invoice.subtotal,
				vat: invoice.vat,
				total: invoice.total,
			})),
		).toEqual([
			{
				adjustment: "6.67",
				subtotal: "66.67",
				vat: "14.00",
				total: "80.67",
			},
			{
				adjustment: "3.33",
				subtotal: "33.33",
				vat: "7.00",
				total: "40.33",
			},
		]);
	});

	it("preserves signed discount conservation", () => {
		const result = calculateTgemInvoiceSplit(
			calculationInput({
				subtotal: "90.00",
				vat: "18.00",
				total: "108.00",
				lines: [
					sourceLine({
						id: "line-1",
						lineNumber: 1,
						quantity: "2",
						unitPrice: "50",
						total: "100.00",
					}),
					sourceLine({
						id: "line-2",
						lineNumber: 2,
						quantity: "2",
						unitPrice: "-5",
						total: "-10.00",
					}),
				],
				lineRequests: [
					{
						lineId: "line-1",
						allocations: [{ projectId: "project-a", quantity: "1" }],
					},
					{
						lineId: "line-2",
						allocations: [{ projectId: "project-a", quantity: "1" }],
					},
				],
			}),
		);

		expect(result.cases.map((invoice) => invoice.lineSum)).toEqual([
			"45.00",
			"45.00",
		]);
		expect(result.cases.map((invoice) => invoice.total)).toEqual([
			"54.00",
			"54.00",
		]);
	});

	it("uses ISO currency minor units", () => {
		expect(getTgemCurrencyMinorUnits("EUR")).toBe(2);
		expect(getTgemCurrencyMinorUnits("JPY")).toBe(0);
		expect(getTgemCurrencyMinorUnits("KWD")).toBe(3);
	});

	it.each([
		["destination_required", calculationInput({ destinationProjectIds: [] })],
		[
			"source_quantity_required",
			calculationInput({
				lines: [
					sourceLine({
						id: "line-1",
						lineNumber: 1,
						quantity: null,
						total: "50.00",
					}),
				],
				lineRequests: [
					{
						lineId: "line-1",
						allocations: [{ projectId: "project-a", quantity: "1" }],
					},
				],
			}),
		],
		[
			"allocation_exceeds_quantity",
			calculationInput({
				lineRequests: [
					{
						lineId: "line-1",
						allocations: [{ projectId: "project-a", quantity: "3" }],
					},
				],
			}),
		],
		[
			"currency_mismatch",
			calculationInput({
				lines: [
					sourceLine({
						id: "line-1",
						lineNumber: 1,
						quantity: "1",
						total: "50.00",
						currency: "USD",
					}),
				],
			}),
		],
		["irreconcilable_headers", calculationInput({ total: "61.02" })],
		[
			"monetary_basis_required",
			calculationInput({
				currency: null,
				subtotal: null,
				vat: null,
				total: null,
				lines: [
					sourceLine({
						id: "line-1",
						lineNumber: 1,
						quantity: "2",
						unitPrice: null,
						total: null,
						currency: null,
					}),
				],
				lineRequests: [
					{
						lineId: "line-1",
						allocations: [{ projectId: "project-a", quantity: "1" }],
					},
				],
			}),
		],
	] as Array<
		[TgemInvoiceSplitCalculationErrorCode, TgemInvoiceSplitCalculationInput]
	>)("rejects invalid split input with %s", (code, input) => {
		expectCalculationError(input, code);
	});
});
