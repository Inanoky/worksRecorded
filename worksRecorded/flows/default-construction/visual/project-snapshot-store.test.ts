import { prisma } from "@/lib/utils/db";
import {
	loadVisualPlanningProjectData,
	visualPlansForLocation,
} from "./planning-store";
import { previewSource } from "./preview-revision";
import {
	loadLimeniProjectSnapshot,
	ProjectAccessError,
} from "./project-snapshot-store";
import { requireVisualAccess } from "./store";

jest.mock("@/lib/utils/db", () => ({
	prisma: { documents: { findMany: jest.fn() } },
}));
jest.mock("./store", () => ({
	requireVisualAccess: jest.fn(),
	visualDrawingIndex: (
		_rows: unknown,
		documents: { id: string; description: string }[],
	) => ({
		drawings: documents.map((row) => ({
			id: row.id,
			location: JSON.parse(row.description).location,
		})),
	}),
}));
jest.mock("./planning-store", () => ({
	loadVisualPlanningProjectData: jest.fn(),
	visualPlansForLocation: jest.fn((location) => ({ location, plans: [] })),
}));
jest.mock("@/server/actions/site-diary-actions", () => ({
	getLimeniDiarySnapshot: async () => ({ rows: [], mediaPhotos: [] }),
	getConfig: async () => ({}),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	getOrganizationLanguageByUserId: async () => "lv",
}));
jest.mock("@/lib/bis/dashboard-status", () => ({
	getDashboardBisStatus: async () => ({ enabled: false }),
}));
jest.mock("../backend/forma2-analytics-actions", () => ({
	getDefaultConstructionForma2Results: async () => ({ resultRows: [] }),
}));

const polygon = [
	{ x: 0.1, y: 0.2 },
	{ x: 0.4, y: 0.2 },
	{ x: 0.4, y: 0.5 },
];
function row(floor: number) {
	return {
		id: `floor-${floor}`,
		documentName: `floor-${floor}.pdf`,
		documentType: "limeni-visual-v1",
		url: `https://a.ufs.sh/${floor}`,
		createdAt: new Date("2026-10-21"),
		description: JSON.stringify({
			version: 1,
			location: `${floor}. stāvs`,
			status: "complete",
			pageCount: 1,
			processed: 1,
			error: null,
			lockedAt: null,
			evidence: [],
			unlocated: [],
			pageScales: { 1: 100 },
			marks: [
				{
					id: "zone",
					evidenceId: "record",
					page: 1,
					polygon,
					layer: "xps",
					anchors: ["A", "B"],
					explanation: "Manual",
					confidence: 1,
				},
			],
			attempts: [
				{
					id: "attempt",
					startedAt: "2026-10-20",
					userId: "user",
					rawOutput: "large response",
					endedAt: null,
					model: "model",
					status: "complete",
					inputTokens: 10,
					outputTokens: 20,
					responseId: null,
				},
			],
		}),
	};
}
beforeEach(() => {
	jest.clearAllMocks();
	jest
		.mocked(requireVisualAccess)
		.mockResolvedValue({ organizationId: "limeni" } as never);
	jest.mocked(loadVisualPlanningProjectData).mockResolvedValue({
		actualRows: [],
		site: { siteDiaryRecordsMap: {} },
	} as never);
	jest
		.mocked(prisma.documents.findMany)
		.mockResolvedValue([row(1), row(2), row(3)] as never);
});

it("authorizes once and loads all floor data once without changing polygon coordinates or scales", async () => {
	const snapshot = await loadLimeniProjectSnapshot("user", "site");
	expect(requireVisualAccess).toHaveBeenCalledTimes(1);
	expect(prisma.documents.findMany).toHaveBeenCalledTimes(1);
	expect(loadVisualPlanningProjectData).toHaveBeenCalledTimes(1);
	expect(visualPlansForLocation).toHaveBeenCalledTimes(3);
	for (const item of snapshot.drawings) {
		expect(item.drawing.state.marks[0].polygon).toEqual(polygon);
		expect(item.drawing.state.pageScales).toEqual({ 1: 100 });
		expect(item.drawing.state.attempts[0]).toMatchObject({
			rawOutput: null,
			inputTokens: 10,
			outputTokens: 20,
		});
	}
	expect((await loadLimeniProjectSnapshot("user", "site")).version).toBe(
		snapshot.version,
	);
});

it("only publishes the preview for the current source revision through an authenticated URL", async () => {
	const document = row(1);
	const source = previewSource(document.url);
	jest.mocked(prisma.documents.findMany).mockResolvedValue([
		document,
		{
			id: `visual-preview:${document.id}:${source}`,
			documentType: "limeni-visual-preview-v1",
			description: JSON.stringify({
				version: 1,
				source,
				pages: [
					{
						page: 1,
						width: 3370,
						height: 2384,
						scales: [100],
						url: "https://a.ufs.sh/page.webp",
					},
				],
			}),
		},
	] as never);
	const result = await loadLimeniProjectSnapshot("user", "site");
	expect(result.drawings[0].preview?.pages[0]).toEqual({
		page: 1,
		width: 3370,
		height: 2384,
		scales: [100],
		url: `/api/sites/site/visual/floor-1/preview/1?v=${source}`,
	});
});

it("rejects unauthorized access before any project queries", async () => {
	jest.mocked(requireVisualAccess).mockRejectedValue(new Error("Denied"));
	await expect(
		loadLimeniProjectSnapshot("user", "site"),
	).rejects.toBeInstanceOf(ProjectAccessError);
	expect(prisma.documents.findMany).not.toHaveBeenCalled();
	expect(loadVisualPlanningProjectData).not.toHaveBeenCalled();
});
