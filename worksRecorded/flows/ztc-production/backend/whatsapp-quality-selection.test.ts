const mockParse = jest.fn();
const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockSend = jest.fn();

jest.mock("openai", () => ({
	__esModule: true,
	default: jest
		.fn()
		.mockImplementation(() => ({ responses: { parse: mockParse } })),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: { ztcRecords: { findFirst: mockFindFirst, update: mockUpdate } },
}));
jest.mock("./canonical-entity-matching", () => ({
	matchZtcCanonicalEntities: jest.fn(),
}));
jest.mock("./project-name-canonicalization", () => ({
	canonicalizeZtcExtractedProjectName: jest.fn(),
}));
jest.mock("@/flows/ztc-production/lib/ztc-record-audit", () => ({
	withZtcRecordAudit: (_: unknown, fn: () => unknown) => fn(),
	ztcMessageAuditContext: () => ({}),
	auditZtcMutation: (_: unknown, fn: (tx: unknown) => unknown) =>
		fn({ ztcRecords: { update: mockUpdate } }),
}));
jest.mock("./whatsapp-worker", () => ({
	findMediaIndexes: () => [],
	findFirstMediaIndex: () => -1,
	getZtcFlowContext: () => ({ siteId: "site", organizationId: "organization" }),
	logZtcTiming: jest.fn(),
	parseJsonObject: (value: string, fallback: unknown) => {
		try {
			return JSON.parse(value);
		} catch {
			return fallback;
		}
	},
	sendZtcMessage: (...args: unknown[]) => mockSend(...args),
}));

import { handleZtcQualityRoute } from "./whatsapp-quality";

const works = ["L4/B4 - Iekšējais latojums", "R4/T4 - Vertikāls latojums 45mm"];

describe("quality work selection route", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockFindFirst.mockResolvedValue({
			id: "qa-session",
			Comments_Custom_1: `__ZTC_QA_PENDING__ ${JSON.stringify({ drawingPhotoUrl: "fixture", drawingMetadata: { elements: [{ works: works.map((name) => ({ name })) }] }, qualityPhotoUrls: [] })}`,
		});
		mockUpdate.mockResolvedValue({});
	});

	async function send(text: string) {
		const formData = new FormData();
		formData.set("Body", text);
		formData.set("From", "fixture");
		await handleZtcQualityRoute({
			formData,
			worker: { id: "worker" } as Parameters<
				typeof handleZtcQualityRoute
			>[0]["worker"],
		});
	}

	it("saves vertical rather than the first latojums option", async () => {
		mockParse.mockResolvedValue({
			output_parsed: {
				scope: "work",
				workCandidateId: "work_1",
				reason: "Vertikālais latojums.",
			},
		});
		await send("Vertikālā latojuma 45 mm kontrole");
		const payload = JSON.parse(
			mockUpdate.mock.calls[0][0].data.Comments_Custom_1.slice(
				"__ZTC_QA_PENDING__".length,
			),
		);
		expect(payload.checkedWork).toBe(works[1]);
		expect(mockSend).toHaveBeenCalledWith(
			"fixture",
			expect.stringContaining(works[1]),
		);
	});

	it("prompts for an unresolved specific work without saving an element-wide inspection", async () => {
		mockParse.mockResolvedValue({
			output_parsed: {
				scope: "unresolved",
				workCandidateId: null,
				reason: "Darbs nav nosakāms.",
			},
		});
		await send("Īpašā latojuma kontrole");
		expect(mockUpdate).not.toHaveBeenCalled();
		expect(mockSend).toHaveBeenCalledWith(
			"fixture",
			expect.stringContaining("izvēlieties darbu"),
		);
	});
});
