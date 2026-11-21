import { randomUUID } from "node:crypto";
import polygonClipping from "polygon-clipping";
import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import {
	isSimplePolygon,
	polygonArea,
	VISUAL_MAX_POLYGON_POINTS,
} from "./model";
import type { SectionBoundary, SectionBoundaryMap } from "./section-boundaries";
import { SMERLA_SECTION_MAP_SITE_ID } from "./section-boundaries";
import { zoneGeometryArea, zoneRingPoints } from "./zone-geometry";

const documentType = "limeni-section-boundaries-v1";
const coordinate = z.number().min(0).max(1);
const ring = z
	.array(z.tuple([coordinate, coordinate]))
	.min(3)
	.max(VISUAL_MAX_POLYGON_POINTS + 1);
const sectionsSchema = z
	.array(
		z.object({
			code: z.enum(["PA1.1", "PA1.2", "PA1.6", "PA1.7"]),
			geometry: z.array(z.array(ring).min(1).max(32)).max(256),
		}),
	)
	.length(2);
const revisionSchema = z.string().uuid();
export const sectionBoundaryEditSchema = z.object({
	revision: revisionSchema.nullable(),
	sections: sectionsSchema,
});
const storedMapSchema = z.object({
	revision: revisionSchema,
	editedAt: z.string(),
	sections: sectionsSchema,
});

async function baseSectionBoundaries(
	siteId: string,
	drawingId: string,
	pdfRevision: string,
) {
	if (siteId !== SMERLA_SECTION_MAP_SITE_ID) return null;
	const { default: maps } = await import(
		"@/assets/visual-sections/ar-701/floor-boundaries.json"
	);
	return (
		(
			maps as Array<
				Omit<SectionBoundaryMap, "revision"> & {
					drawingId: string;
					pdfRevision: string;
				}
			>
		).find(
			(map) => map.drawingId === drawingId && map.pdfRevision === pdfRevision,
		) ?? null
	);
}

function boundaryRow(
	siteId: string,
	organizationId: string,
	drawingId: string,
	pdfRevision: string,
) {
	return {
		id: `${documentType}:${drawingId}:${pdfRevision}`,
		siteId,
		organizationId,
		documentType,
	};
}

export async function readSectionBoundaries(
	siteId: string,
	drawingId: string,
	pdfRevision: string,
	organizationId: string,
): Promise<SectionBoundaryMap | null> {
	const base = await baseSectionBoundaries(siteId, drawingId, pdfRevision);
	if (!base) return null;
	const existing = await prisma.documents.findFirst({
		where: boundaryRow(siteId, organizationId, drawingId, pdfRevision),
		select: { description: true },
	});
	return existing
		? { ...base, ...storedMapSchema.parse(JSON.parse(existing.description)) }
		: { ...base, revision: null };
}

export function validateSectionBoundaries(
	sections: SectionBoundary[],
	current: SectionBoundary[],
) {
	if (sections.some(({ code }, index) => current[index]?.code !== code))
		return "Rasējumam izvēlētas neatbilstošas sekcijas.";

	const epsilon = 1e-10;
	try {
		for (const [index, section] of sections.entries()) {
			const previous = new Set(
				current[index].geometry.map((polygon) => JSON.stringify(polygon)),
			);
			for (const polygon of section.geometry) {
				if (previous.has(JSON.stringify(polygon))) continue;
				const [outer, ...holes] = polygon;
				for (const ring of polygon) {
					const points = zoneRingPoints(ring);
					if (
						points.length < 3 ||
						points.length > VISUAL_MAX_POLYGON_POINTS ||
						polygonArea(points) <= 1e-14 ||
						!isSimplePolygon(points)
					)
						return "Poligona robeža krustojas vai laukums ir pārāk mazs.";
				}
				if (
					holes.some(
						(hole) =>
							zoneGeometryArea(polygonClipping.difference([hole], [outer])) >
							epsilon,
					)
				)
					return "Izgriezumam jāatrodas poligona iekšpusē.";
				if (
					Math.abs(
						zoneGeometryArea([polygon]) -
							zoneGeometryArea(polygonClipping.union(polygon)),
					) > epsilon
				)
					return "Poligona izgriezumi pārklājas.";
			}
			if (
				section.geometry.length &&
				zoneGeometryArea(section.geometry) -
					zoneGeometryArea(polygonClipping.union(section.geometry)) >
					epsilon
			)
				return `Sekcijas ${section.code} poligoni pārklājas.`;
		}
		if (
			sections[0].geometry.length &&
			sections[1].geometry.length &&
			zoneGeometryArea(
				polygonClipping.intersection(
					sections[0].geometry,
					sections[1].geometry,
				),
			) > 1e-9
		)
			return "Sekciju laukumi pārklājas. Pielāgojiet to robežas.";
	} catch {
		return "Neizdevās pārbaudīt poligonu robežas.";
	}
	return null;
}

export async function saveSectionBoundaries({
	siteId,
	drawingId,
	pdfRevision,
	organizationId,
	userId,
	edit,
}: {
	siteId: string;
	drawingId: string;
	pdfRevision: string;
	organizationId: string;
	userId: string;
	edit: z.infer<typeof sectionBoundaryEditSchema>;
}): Promise<
	{ map: SectionBoundaryMap } | { status: 404 | 409 | 422; error: string }
> {
	const base = await baseSectionBoundaries(siteId, drawingId, pdfRevision);
	if (!base)
		return { status: 404, error: "Šai rasējuma versijai nav sekciju kartes." };
	const where = boundaryRow(siteId, organizationId, drawingId, pdfRevision);
	const existing = await prisma.documents.findFirst({
		where,
		select: { description: true },
	});
	const saved = existing
		? storedMapSchema.parse(JSON.parse(existing.description))
		: null;
	const conflict = {
		status: 409 as const,
		error:
			"Karte ir mainīta citā logā. Atceliet labojumus un ielādējiet jaunāko karti.",
	};
	if (edit.revision !== (saved?.revision ?? null)) return conflict;
	const error = validateSectionBoundaries(
		edit.sections,
		saved?.sections ?? base.sections,
	);
	if (error) return { status: 422, error };
	const override = {
		revision: randomUUID(),
		editedAt: new Date().toISOString(),
		sections: edit.sections,
	};
	const description = JSON.stringify(override);
	const result = existing
		? await prisma.documents.updateMany({
				where: { ...where, description: existing.description },
				data: { description, userId },
			})
		: await prisma.documents.createMany({
				data: {
					...where,
					url: "",
					documentName: `Sekciju robežas · ${base.drawing}`,
					description,
					userId,
				},
				skipDuplicates: true,
			});
	return result.count === 1 ? { map: { ...base, ...override } } : conflict;
}
