const mockFindMany = jest.fn();

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		sitediaryrecords: {
			findMany: mockFindMany,
		},
	},
}));

import type { ConfigMap } from "./AIschemas";
import { buildSiteDiaryExtractionContext } from "./siteDiaryExtractionContext";

const baseConfig: ConfigMap = {
	Date: {
		Type: "fixed",
		DisplayName: "Date",
	},
	Location: {
		Type: "dropdown",
		DisplayName: "Location",
		DropDownOptions: {
			project: "Project",
			basement: "Basement",
		},
	},
	Works: {
		Type: "dropdown",
		DisplayName: "Works",
		DropDownOptions: {
			concrete: "Concrete works",
			cleaning: "Cleaning",
		},
	},
	Comments: {
		Type: "textInput",
		DisplayName: "Comments",
	},
	Amounts: {
		Type: "float",
		DisplayName: "Amounts",
	},
	Units: {
		Type: "dropdown",
		DisplayName: "Units",
		DropDownOptions: {
			m2: "m2",
			hour: "hour",
		},
	},
	WorkersInvolved: {
		Type: "float",
		DisplayName: "Workers",
		customSettings: { integer: true },
	},
	TimeInvolved: {
		Type: "float",
		DisplayName: "Hours",
	},
	Hidden: {
		Type: "noRender",
		DisplayName: "Hidden",
		DropDownOptions: {
			hidden: "Hidden option",
		},
	},
};

describe("buildSiteDiaryExtractionContext", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockFindMany.mockResolvedValue([]);
	});

	it("includes schema dropdown options and numeric field guidance", async () => {
		const result = await buildSiteDiaryExtractionContext({
			siteId: "site-1",
			userId: "user-1",
			requestedDate: "15-06-2026",
			sourceText: "Šodien betonēšana.",
			config: baseConfig,
		});

		expect(result.text).toContain("Site diary schema context");
		expect(result.text).toContain("Concrete works");
		expect(result.text).toContain("Cleaning");
		expect(result.text).toContain("m2");
		expect(result.text).toContain("WorkersInvolved");
		expect(result.text).toContain("Leave null if the worker count is unknown");
		expect(result.text).not.toContain("Hidden option");
		expect(result.metadata.schemaOptionCount).toBe(6);
	});

	it("queries only same site/user non-archived recent diary rows", async () => {
		await buildSiteDiaryExtractionContext({
			siteId: "site-1",
			userId: "user-1",
			requestedDate: "15-06-2026",
			sourceText: "Tas pats darbs kā vakar, 2h.",
			config: baseConfig,
		});

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					siteId: "site-1",
					userId: "user-1",
					archivedAt: null,
					Date: expect.objectContaining({
						gte: expect.any(Date),
						lte: expect.any(Date),
					}),
				}),
				take: 5,
				orderBy: [{ createdAt: "desc" }],
				select: expect.not.objectContaining({ id: true }),
			}),
		);
	});

	it("renders recent reference items without internal ids or raw message dumps", async () => {
		mockFindMany.mockResolvedValue([
			{
				id: "hidden-record-id",
				Date: new Date("2026-06-14T00:00:00.000Z"),
				createdAt: new Date("2026-06-14T15:30:00.000Z"),
				Location: "2. stāvs",
				Works: "Cleaning",
				Comments: "Iztīrītas telpas.",
				Units: "hour",
				Amounts: null,
				WorkersInvolved: 2,
				TimeInvolved: 4,
				originalUserComment: "Vakar 2. stāvā tīrīšana, 2 cilvēki, 4h.",
			},
		]);

		const result = await buildSiteDiaryExtractionContext({
			siteId: "site-1",
			userId: "user-1",
			requestedDate: "15-06-2026",
			sourceText: "Tas pats kā vakar, vēl 3h.",
			config: baseConfig,
		});

		expect(result.metadata.recentRecordCount).toBe(1);
		expect(result.metadata.hasExplicitContextReference).toBe(true);
		expect(result.text).toContain(
			"CurrentMessageHasExplicitContextReference: true",
		);
		expect(result.text).toContain("Reference item 1");
		expect(result.text).toContain(
			"ValidForExplicitReferencesUntil: 2026-06-15",
		);
		expect(result.text).toContain("RelativeDate: yesterday");
		expect(result.text).toContain("2. stāvs");
		expect(result.text).toContain("WorkersInvolved: 2");
		expect(result.text).toContain("SourcePreview:");
		expect(result.text).not.toContain("OriginalUserComment");
		expect(result.text).not.toContain("hidden-record-id");
	});

	it("marks standalone messages as not eligible to copy reference values", async () => {
		const result = await buildSiteDiaryExtractionContext({
			siteId: "site-1",
			userId: "user-1",
			requestedDate: "15-06-2026",
			sourceText: "Šodien betonēšana, 3h.",
			config: baseConfig,
		});

		expect(result.metadata.hasExplicitContextReference).toBe(false);
		expect(result.text).toContain(
			"CurrentMessageHasExplicitContextReference: false",
		);
		expect(result.text).toContain(
			"If CurrentMessageHasExplicitContextReference=false, ignore reference items for field values.",
		);
	});

	it("bounds long context text", async () => {
		mockFindMany.mockResolvedValue(
			Array.from({ length: 8 }, (_, index) => ({
				Date: new Date("2026-06-14T00:00:00.000Z"),
				createdAt: new Date("2026-06-14T15:30:00.000Z"),
				Location: `Location ${index}`,
				Works: `Work ${index}`,
				Comments: "x".repeat(4_000),
				Units: null,
				Amounts: null,
				WorkersInvolved: null,
				TimeInvolved: null,
				originalUserComment: "y".repeat(4_000),
			})),
		);
		const config: ConfigMap = {
			...baseConfig,
			Works: {
				Type: "dropdown",
				DisplayName: "Works",
				DropDownOptions: Object.fromEntries(
					Array.from({ length: 200 }, (_, index) => [
						`work-${index}`,
						`Very long work option ${index} ${"z".repeat(100)}`,
					]),
				),
			},
		};

		const result = await buildSiteDiaryExtractionContext({
			siteId: "site-1",
			userId: "user-1",
			requestedDate: "15-06-2026",
			sourceText: "x".repeat(2_000),
			config,
		});

		expect(result.metadata.truncated).toBe(true);
		expect(result.text.length).toBeLessThanOrEqual(12_000);
		expect(result.text).toContain(
			"[context truncated to bounded extraction budget]",
		);
	});
});
