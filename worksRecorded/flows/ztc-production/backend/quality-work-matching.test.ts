const mockParse = jest.fn();

jest.mock("openai", () => ({
	__esModule: true,
	default: jest
		.fn()
		.mockImplementation(() => ({ responses: { parse: mockParse } })),
}));

import { matchZtcQualityWork } from "./quality-work-matching";

const works = [
	"L4/B4 - Iekšējais latojums",
	"L1/B1 - Latas 45mm uz karkasa",
	"R4/T4 - Vertikāls latojums 45mm",
	"R5/T5 - Horizontāls latojums 32mm",
];

describe("matchZtcQualityWork", () => {
	beforeEach(() => mockParse.mockReset());

	it.each(["3", "R4/T4", works[2]])(
		"uses explicit selection %s without a model",
		async (text) => {
			expect((await matchZtcQualityWork(text, works)).checkedWork).toBe(
				works[2],
			);
			expect(mockParse).not.toHaveBeenCalled();
		},
	);

	it("does not choose the first shared latojums token", async () => {
		mockParse.mockResolvedValue({
			output_parsed: {
				scope: "work",
				workCandidateId: "work_2",
				reason: "Vertikālais latojums.",
			},
		});
		expect(
			(await matchZtcQualityWork("Vertikālā latojuma 45 mm kontrole", works))
				.checkedWork,
		).toBe(works[2]);
		const input = JSON.parse(mockParse.mock.calls[0][0].input);
		expect(input.candidates).toHaveLength(4);
	});

	it("leaves an unsuitable specific work unresolved", async () => {
		mockParse.mockResolvedValue({
			output_parsed: {
				scope: "unresolved",
				workCandidateId: null,
				reason: "Nav atbilstoša darba.",
			},
		});
		expect(
			await matchZtcQualityWork("Vertikālā latojuma kontrole", [works[0]]),
		).toEqual({
			scope: "unresolved",
			checkedWork: null,
			reason: "Nav atbilstoša darba.",
		});
	});

	it("does not reinterpret an unresolved specific work as element-wide inspection", async () => {
		mockParse.mockResolvedValue({
			output_parsed: {
				scope: "unresolved",
				workCandidateId: null,
				reason: "Neskaidra darba izvēle.",
			},
		});
		expect((await matchZtcQualityWork("Īpašs latojums", works)).scope).toBe(
			"unresolved",
		);
	});

	it("accepts explicit element scope", async () => {
		mockParse.mockResolvedValue({
			output_parsed: {
				scope: "element",
				workCandidateId: null,
				reason: "Viss panelis.",
			},
		});
		expect(
			(await matchZtcQualityWork("Viss panelis pieņemts", works)).scope,
		).toBe("element");
	});

	it("accepts an empty candidate ID for explicit element scope", async () => {
		mockParse.mockResolvedValue({
			output_parsed: {
				scope: "element",
				workCandidateId: "",
				reason: "Viss panelis.",
			},
		});
		expect(
			(await matchZtcQualityWork("Viss panelis pieņemts", works)).scope,
		).toBe("element");
	});

	it("rejects an invented candidate ID", async () => {
		mockParse.mockResolvedValue({
			output_parsed: {
				scope: "work",
				workCandidateId: "work_30",
				reason: "Nezināms.",
			},
		});
		expect(
			(await matchZtcQualityWork("Vertikāls latojums", works)).checkedWork,
		).toBeNull();
	});

	it("leaves API failures unresolved", async () => {
		mockParse.mockRejectedValue(new Error("timeout"));
		expect((await matchZtcQualityWork("Vertikāls latojums", works)).scope).toBe(
			"unresolved",
		);
	});

	it("does not use a model for an invalid list number", async () => {
		expect((await matchZtcQualityWork("99", works)).scope).toBe("unresolved");
		expect(mockParse).not.toHaveBeenCalled();
	});
});
