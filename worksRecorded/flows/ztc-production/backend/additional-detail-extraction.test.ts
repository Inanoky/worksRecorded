const mockCreate = jest.fn();
jest.mock("openai", () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		chat: {
			completions: { create: (...args: unknown[]) => mockCreate(...args) },
		},
	})),
}));

import {
	extractZtcAdditionalDetails,
	hasZtcAdditionalDetailReport,
	parseZtcAdditionalDetailExtraction,
	ZtcAdditionalDetailExtractionError,
} from "./additional-detail-extraction";

const text =
	"Pabeidzu papilddetalas kārbu iestrāde 1 gab papilddetaļas cilpu iestrāde 2 gab";
const extracted = {
	noneReason: null,
	details: [
		{
			description: "kārbu iestrāde",
			quantity: 1,
			sourceText: "kārbu iestrāde 1 gab",
		},
		{
			description: "cilpu iestrāde",
			quantity: 2,
			sourceText: "cilpu iestrāde 2 gab",
		},
	],
};

beforeEach(() => mockCreate.mockReset());

it("extracts both detail types independently of the main drawing-work list", async () => {
	mockCreate.mockResolvedValue({
		choices: [{ message: { content: JSON.stringify(extracted) } }],
	});
	await expect(extractZtcAdditionalDetails(text)).resolves.toEqual(
		extracted.details,
	);
	expect(mockCreate.mock.calls[0][0].messages[1].content).toBe(text);
});

it.each([
	"papilddetalas",
	"papilddetaļas",
	"papildu detaļas",
	"papildus detaļas",
])("recognizes explicit marker %s", (marker) => {
	expect(hasZtcAdditionalDetailReport(`${marker} kārbu iestrāde 1 gab`)).toBe(
		true,
	);
});

it("rejects the production failure: explicit details but an empty extraction", () => {
	expect(() =>
		parseZtcAdditionalDetailExtraction(text, {
			details: [],
			noneReason: "no_details",
		}),
	).toThrow(ZtcAdditionalDetailExtractionError);
});

it("allows a finish message without details", () => {
	expect(
		parseZtcAdditionalDetailExtraction("Pabeidzu", {
			details: [],
			noneReason: "no_details",
		}),
	).toEqual([]);
});

it.each(["negated", "question"])(
	"does not turn a %s report into payable parts",
	(noneReason) => {
		expect(
			parseZtcAdditionalDetailExtraction("Papilddetaļas nebija vajadzīgas", {
				details: [],
				noneReason,
			}),
		).toEqual([]);
	},
);

it("preserves an unspecified quantity instead of inventing one piece", () => {
	expect(
		parseZtcAdditionalDetailExtraction("Papilddetaļas statņi reģipsim", {
			noneReason: null,
			details: [
				{
					description: "statņi reģipsim",
					quantity: null,
					sourceText: "statņi reģipsim",
				},
			],
		})[0].quantity,
	).toBeNull();
});

it("rejects invented source evidence", () => {
	expect(() =>
		parseZtcAdditionalDetailExtraction(text, {
			noneReason: null,
			details: [
				{ description: "skrūves", quantity: 4, sourceText: "4 skrūves" },
			],
		}),
	).toThrow("source evidence");
});

it.each([0, -1, "2", undefined])("rejects invalid quantity %s", (quantity) => {
	expect(() =>
		parseZtcAdditionalDetailExtraction(text, {
			noneReason: null,
			details: [{ ...extracted.details[0], quantity }],
		}),
	).toThrow(ZtcAdditionalDetailExtractionError);
});

it.each([null, "not JSON"])(
	"rejects a missing or malformed model response",
	async (content) => {
		mockCreate.mockResolvedValue({ choices: [{ message: { content } }] });
		await expect(extractZtcAdditionalDetails(text)).rejects.toThrow(
			ZtcAdditionalDetailExtractionError,
		);
	},
);
