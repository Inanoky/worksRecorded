import polygonClipping from "polygon-clipping";
import maps from "@/assets/visual-sections/ar-701/floor-boundaries.json";
import { prisma } from "@/lib/utils/db";
import { drawingFileRevision } from "./preview-revision";
import {
	type SectionBoundary,
	SMERLA_SECTION_MAP_SITE_ID,
} from "./section-boundaries";
import {
	readSectionBoundaries,
	saveSectionBoundaries,
	sectionBoundaryEditSchema,
	validateSectionBoundaries,
} from "./section-boundary-store";
import { zoneGeometryArea } from "./zone-geometry";

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		documents: {
			findFirst: jest.fn(),
			createMany: jest.fn(),
			updateMany: jest.fn(),
		},
	},
}));
const siteId = SMERLA_SECTION_MAP_SITE_ID;
const organizationId = "limeni";
const documents = jest.mocked(prisma.documents);
const savedFloor = maps[0];

beforeEach(() => {
	jest.resetAllMocks();
	documents.findFirst.mockResolvedValue(null);
});

it("serves Šmerļa boundaries only for the reviewed drawing revision", async () => {
	const { drawingId, pdfRevision } = maps[0];
	await expect(
		readSectionBoundaries(
			"another-site",
			drawingId,
			pdfRevision,
			organizationId,
		),
	).resolves.toBeNull();
	await expect(
		readSectionBoundaries(
			SMERLA_SECTION_MAP_SITE_ID,
			drawingId,
			"new-revision",
			organizationId,
		),
	).resolves.toBeNull();
	await expect(
		readSectionBoundaries(siteId, "roof", pdfRevision, organizationId),
	).resolves.toBeNull();
	expect(documents.findFirst).not.toHaveBeenCalled();
	await expect(
		readSectionBoundaries(siteId, drawingId, pdfRevision, organizationId),
	).resolves.toMatchObject({
		drawing: "S3A_AR_201_1_stavs.pdf",
		page: 1,
		revision: null,
	});
});

it("keeps the verified section geometries distinct and inside each drawing", async () => {
	expect(maps).toHaveLength(3);
	for (const [floor, { drawingId, pdfRevision }] of maps.entries()) {
		const map = await readSectionBoundaries(
			SMERLA_SECTION_MAP_SITE_ID,
			drawingId,
			pdfRevision,
			organizationId,
		);
		expect(map?.sections.map(({ code }) => code)).toEqual(
			floor === 0 ? ["PA1.6", "PA1.7"] : ["PA1.1", "PA1.2"],
		);
		if (!map) throw new Error("Missing floor boundaries");
		const [dry, wet] = map.sections;
		expect(validateSectionBoundaries(map.sections, map.sections)).toBeNull();
		for (const { geometry } of map.sections) {
			expect(zoneGeometryArea(geometry)).toBeGreaterThan(0);
			expect(
				geometry
					.flat(3)
					.every((coordinate) => coordinate >= 0 && coordinate <= 1),
			).toBe(true);
		}
		expect(
			zoneGeometryArea(
				polygonClipping.intersection(dry.geometry, wet.geometry),
			),
		).toBeLessThan(1e-9);
	}
});

it("saves a changed polygon as a scoped override and restores it with the original source", async () => {
	const { drawingId, pdfRevision, finishDrawing } = savedFloor;
	const sections = sectionBoundaryEditSchema.parse({
		revision: null,
		sections: savedFloor.sections,
	}).sections;
	sections[0].geometry.push([
		[
			[0.01, 0.01],
			[0.02, 0.01],
			[0.02, 0.02],
			[0.01, 0.02],
		],
	]);
	const input = {
		siteId,
		drawingId,
		pdfRevision,
		organizationId,
		userId: "editor",
		edit: { revision: null, sections },
	};
	documents.createMany.mockResolvedValue({ count: 1 });
	const result = await saveSectionBoundaries(input);
	expect(result).toMatchObject({
		map: { finishDrawing, sections, revision: expect.any(String) },
	});
	const row = documents.createMany.mock.calls[0]?.[0]?.data;
	if (!row || !("description" in row)) throw new Error("Missing saved map");
	expect(row).toMatchObject({ siteId, organizationId, userId: "editor" });
	documents.findFirst.mockResolvedValue({
		description: row.description,
	} as never);
	await expect(
		readSectionBoundaries(siteId, drawingId, pdfRevision, organizationId),
	).resolves.toEqual("map" in result && result.map);
	await expect(saveSectionBoundaries(input)).resolves.toMatchObject({
		status: 409,
	});
	await expect(
		readSectionBoundaries(
			siteId,
			drawingId,
			drawingFileRevision("different.pdf"),
			organizationId,
		),
	).resolves.toBeNull();

	if (!("map" in result)) throw new Error("Missing saved map");
	documents.updateMany.mockResolvedValue({ count: 0 });
	await expect(
		saveSectionBoundaries({
			...input,
			edit: { revision: result.map.revision, sections },
		}),
	).resolves.toMatchObject({ status: 409 });
	expect(documents.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				siteId,
				organizationId,
				description: row.description,
			}),
		}),
	);
});

it("accepts a dry polygon with a bathroom cutout and rejects cross-section overlap", () => {
	const bathroom = [
		[0.3, 0.3],
		[0.4, 0.3],
		[0.4, 0.4],
		[0.3, 0.4],
	] as SectionBoundary["geometry"][number][number];
	const outer = [
		[0.2, 0.2],
		[0.5, 0.2],
		[0.5, 0.5],
		[0.2, 0.5],
	] as typeof bathroom;
	const current: SectionBoundary[] = [
		{ code: "PA1.6", geometry: [] },
		{ code: "PA1.7", geometry: [[bathroom]] },
	];
	expect(
		validateSectionBoundaries(
			[{ code: "PA1.6", geometry: [[outer, bathroom]] }, current[1]],
			current,
		),
	).toBeNull();
	expect(
		validateSectionBoundaries(
			[{ code: "PA1.6", geometry: [[outer]] }, current[1]],
			current,
		),
	).toMatch(/pārklājas/);
	expect(
		validateSectionBoundaries(
			[
				{
					code: "PA1.6",
					geometry: [[[outer[0], outer[2], outer[1], outer[3]]]],
				},
				current[1],
			],
			current,
		),
	).toMatch(/krustojas/);
});
