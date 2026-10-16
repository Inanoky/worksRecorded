import { File as NodeFile } from "node:buffer";
import { prisma } from "@/lib/utils/db";
import { VISUAL_DOCUMENT_TYPE } from "./model";
import { VISUAL_SHARE_TYPE } from "./planning-share-model";
import {
	loadPublicVisualWork,
	publishVisualPlanningShare,
	revokeVisualPlanningShare,
} from "./planning-share-store";
import { loadVisualDrawing, requireVisualAccess } from "./store";

const mockUpload = jest.fn();
const mockDelete = jest.fn();
jest.mock("uploadthing/server", () => ({
	UTApi: jest.fn(() => ({ uploadFiles: mockUpload, deleteFiles: mockDelete })),
}));
jest.mock("sharp", () =>
	jest.fn(() => ({
		rotate: () => ({
			jpeg: () => ({ toBuffer: async () => Buffer.from([255, 216, 255, 217]) }),
		}),
	})),
);
jest.mock("./store", () => ({
	requireVisualAccess: jest.fn(),
	loadVisualDrawing: jest.fn(),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		$transaction: jest.fn(),
		site: { findFirst: jest.fn() },
		constructionPlan: { findFirst: jest.fn() },
		documents: {
			create: jest.fn(),
			findFirst: jest.fn(),
			deleteMany: jest.fn(),
		},
	},
}));
const siteId = "11111111-1111-4111-8111-111111111111";
const planId = "22222222-2222-4222-8222-222222222222";
const drawingId = "33333333-3333-4333-8333-333333333333";
const organizationId = "58467603-196e-4661-83ff-fe26e4b0ff0b";
const row = {
	id: planId,
	siteId,
	version: 2,
	visualDrawingId: drawingId,
	work: "XPS",
	location: "1. stāvs",
	unit: "m2",
	quantity: 50,
	startDate: new Date("2026-10-16"),
	date: new Date("2026-10-17"),
	visualPlanningContactId: null,
	visualAreas: {
		version: 1,
		section: "A",
		areas: [
			{
				id: "a",
				page: 1,
				polygon: [
					{ x: 0.1, y: 0.1 },
					{ x: 0.4, y: 0.1 },
					{ x: 0.4, y: 0.4 },
				],
			},
		],
	},
	geometryReviewRequired: false,
	archivedAt: null,
};
const input = { planId, version: 2, pages: [1] };
const files = () => [
	new NodeFile([Buffer.from([255, 216, 255, 217])], "zone.jpg", {
		type: "image/jpeg",
	}) as unknown as File,
];

it("publishes only the saved selected section alongside the task zones", async () => {
	jest
		.mocked(prisma.site.findFirst)
		.mockResolvedValue({ id: siteId, name: "Šmerļa iela 3" } as never);
	jest
		.mocked(prisma.constructionPlan.findFirst)
		.mockResolvedValue({
			...row,
			visualAreas: { ...row.visualAreas, section: "PA1.6" },
		} as never);
	mockUpload.mockResolvedValue([
		{ data: { key: "zone", ufsUrl: "https://files.ufs.sh/f/zone.jpg" } },
		{ data: { key: "section", ufsUrl: "https://files.ufs.sh/f/section.jpg" } },
	]);
	await publishVisualPlanningShare("user", siteId, input, files());
	const uploads = mockUpload.mock.calls[0][0] as File[];
	expect(uploads).toHaveLength(2);
	expect(uploads[1].name).toBe("section-PA1.6.jpg");
	const snapshot = JSON.parse(
		String(
			jest.mocked(prisma.documents.create).mock.calls[0][0].data.description,
		),
	);
	expect(
		snapshot.images.map((image: { page: number; section?: string }) => ({
			page: image.page,
			section: image.section,
		})),
	).toEqual([{ page: 1 }, { page: 11, section: "PA1.6" }]);
});
let saved: { id: string; description: string; siteId: string } | null;
beforeEach(() => {
	jest.clearAllMocks();
	saved = null;
	jest
		.mocked(requireVisualAccess)
		.mockResolvedValue({ organizationId } as never);
	jest.mocked(loadVisualDrawing).mockResolvedValue({} as never);
	jest
		.mocked(prisma.constructionPlan.findFirst)
		.mockResolvedValue(row as never);
	jest.mocked(prisma.site.findFirst).mockResolvedValue({ id: siteId } as never);
	jest.mocked(prisma.documents.create).mockImplementation((async (args: {
		data: typeof saved;
	}) => {
		saved = args.data;
		return saved;
	}) as never);
	jest
		.mocked(prisma.documents.findFirst)
		.mockImplementation((async (args: {
			where: { id: string; documentType: string };
		}) =>
			args.where.documentType === VISUAL_SHARE_TYPE
				? saved
				: { id: drawingId }) as never);
	jest
		.mocked(prisma.$transaction)
		.mockImplementation((async (fn: (tx: typeof prisma) => unknown) =>
			fn(prisma)) as never);
	mockUpload.mockResolvedValue([
		{
			data: {
				key: "uploaded-image",
				ufsUrl: "https://files.ufs.sh/f/image.jpg",
			},
			error: null,
		},
	]);
	mockDelete.mockResolvedValue({ success: true });
});
it("publishes only saved scoped plan images, stores a hash and opens without an authenticated user", async () => {
	const result = await publishVisualPlanningShare(
		"user",
		siteId,
		input,
		files(),
	);
	expect(result.token).toMatch(/^[0-9a-f-]{36}\.[0-9a-f]{64}$/);
	expect(saved?.description).not.toContain(result.token.split(".")[1]);
	jest.mocked(requireVisualAccess).mockClear();
	expect(await loadPublicVisualWork(result.token)).toMatchObject({
		work: "XPS",
		section: "A",
		images: [{ page: 1 }],
	});
	expect(requireVisualAccess).not.toHaveBeenCalled();
	expect(prisma.documents.findFirst).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				id: drawingId,
				siteId,
				documentType: VISUAL_DOCUMENT_TYPE,
				organizationId,
			}),
		}),
	);
});
it("rejects malformed or guessed tokens and never exposes another document type", async () => {
	expect(await loadPublicVisualWork("bad")).toBeNull();
	expect(prisma.documents.findFirst).not.toHaveBeenCalled();
	const { token } = await publishVisualPlanningShare(
		"user",
		siteId,
		input,
		files(),
	);
	expect(
		await loadPublicVisualWork(`${token.split(".")[0]}.${"a".repeat(64)}`),
	).toBeNull();
	expect(prisma.documents.findFirst).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				documentType: VISUAL_SHARE_TYPE,
				organizationId,
			}),
		}),
	);
});
it("stops archived/deleted work and moved projects from remaining public", async () => {
	const { token } = await publishVisualPlanningShare(
		"user",
		siteId,
		input,
		files(),
	);
	jest.mocked(prisma.constructionPlan.findFirst).mockResolvedValue(null);
	expect(await loadPublicVisualWork(token)).toBeNull();
	jest
		.mocked(prisma.constructionPlan.findFirst)
		.mockResolvedValue(row as never);
	jest.mocked(prisma.site.findFirst).mockResolvedValue(null);
	expect(await loadPublicVisualWork(token)).toBeNull();
});
it("checks membership and stale versions before uploading anything", async () => {
	jest
		.mocked(requireVisualAccess)
		.mockRejectedValueOnce(new Error("Forbidden"));
	await expect(
		publishVisualPlanningShare("user", siteId, input, files()),
	).rejects.toThrow("Forbidden");
	jest.mocked(prisma.constructionPlan.findFirst).mockResolvedValueOnce(null);
	await expect(
		publishVisualPlanningShare("user", siteId, input, files()),
	).rejects.toThrow("Plāns");
	expect(mockUpload).not.toHaveBeenCalled();
});
it("requires exactly the plan pages and bounded JPEG input", async () => {
	await expect(
		publishVisualPlanningShare(
			"user",
			siteId,
			{ ...input, pages: [2] },
			files(),
		),
	).rejects.toThrow("Trūkst");
	await expect(
		publishVisualPlanningShare("user", siteId, input, [
			new NodeFile(["bad"], "svg", {
				type: "image/svg+xml",
			}) as unknown as File,
		]),
	).rejects.toThrow("Nederīgs");
	expect(mockUpload).not.toHaveBeenCalled();
});
it("cleans only its own new uploads if the snapshot cannot be saved", async () => {
	jest
		.mocked(prisma.$transaction)
		.mockRejectedValueOnce(new Error("DB failure"));
	await expect(
		publishVisualPlanningShare("user", siteId, input, files()),
	).rejects.toThrow("DB failure");
	expect(mockDelete).toHaveBeenCalledWith(["uploaded-image"]);
});
it("revokes with authenticated organization and project scope", async () => {
	const { token } = await publishVisualPlanningShare(
		"user",
		siteId,
		input,
		files(),
	);
	await revokeVisualPlanningShare("user", siteId, token);
	expect(prisma.documents.deleteMany).toHaveBeenCalledWith({
		where: {
			id: token.split(".")[0],
			siteId,
			organizationId,
			documentType: VISUAL_SHARE_TYPE,
		},
	});
});
