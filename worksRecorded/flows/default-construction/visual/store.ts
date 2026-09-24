import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/utils/db";
import { requireWarehouseImportAccess } from "../backend/warehouse-import-upload";
import {
	LIMENI_ORGANIZATION_ID,
	normalizeDiaryPhotoUrls,
} from "../lib/diary-photos";
import {
	normalizeVisualLocation,
	VISUAL_DOCUMENT_TYPE,
	VISUAL_LEASE_MS,
	VISUAL_MAX_PHOTOS,
	type VisualDrawing,
	type VisualState,
	visualStateSchema,
} from "./model";
import { polygonEditSchema } from "./polygon-edit";

const archivedVisualType = `${VISUAL_DOCUMENT_TYPE}-archived`;

function locationMatches(description: string, location: string) {
	try {
		return (
			normalizeVisualLocation(JSON.parse(description).location) ===
			normalizeVisualLocation(location)
		);
	} catch {
		return false;
	}
}

export async function requireVisualAccess(userId: string, siteId: string) {
	const access = await requireWarehouseImportAccess(userId, siteId);
	if (access.organizationId !== LIMENI_ORGANIZATION_ID)
		throw new Error("Visual skats šai organizācijai nav pieejams.");
	return access;
}

export async function listVisualDrawings(userId: string, siteId: string) {
	const access = await requireVisualAccess(userId, siteId);
	const [rows, documents] = await Promise.all([
		prisma.sitediaryrecords.findMany({
			where: {
				siteId,
				organizationId: access.organizationId,
				archivedAt: null,
				Location: { not: null },
			},
			select: { Location: true },
			distinct: ["Location"],
		}),
		prisma.documents.findMany({
			where: {
				siteId,
				organizationId: access.organizationId,
				documentType: VISUAL_DOCUMENT_TYPE,
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			select: {
				id: true,
				documentName: true,
				createdAt: true,
				description: true,
			},
		}),
	]);
	const seenLocations = new Set<string>();
	const drawings = documents.flatMap((row) => {
		try {
			const state = visualStateSchema.parse(JSON.parse(row.description));
			const key = normalizeVisualLocation(state.location);
			if (seenLocations.has(key)) return [];
			seenLocations.add(key);
			return [
				{
					id: row.id,
					name: row.documentName,
					createdAt: row.createdAt.toISOString(),
					location: state.location,
					status: state.status,
				},
			];
		} catch {
			return [];
		}
	});
	const locations = [
		...new Set(
			[
				...rows.map((row) => row.Location?.trim() || ""),
				...drawings.map((row) => row.location),
			].filter(Boolean),
		),
	].sort((a, b) => a.localeCompare(b, "lv"));
	return { locations, drawings };
}

export async function createVisualDrawing(args: {
	userId: string;
	siteId: string;
	location: string;
	url: string;
	name: string;
	replaceDrawingId?: string;
}) {
	const access = await requireVisualAccess(args.userId, args.siteId);
	const location = args.location.trim();
	if (!location || location.length > 200)
		throw new Error("Izvēlieties lokāciju.");
	const rows = await prisma.sitediaryrecords.findMany({
		where: {
			siteId: args.siteId,
			organizationId: access.organizationId,
			archivedAt: null,
			Photos: { isEmpty: false },
		},
		select: {
			id: true,
			Location: true,
			Works: true,
			Comments: true,
			Photos: true,
			Date: true,
			Amounts: true,
			Units: true,
		},
		orderBy: [{ Date: "asc" }, { id: "asc" }],
	});
	const evidence = rows
		.filter(
			(row) =>
				normalizeVisualLocation(row.Location || "") ===
				normalizeVisualLocation(location),
		)
		.flatMap((row) =>
			normalizeDiaryPhotoUrls(row.Photos).map((photoUrl, index) => ({
				id: `${row.id}:${index}`,
				recordId: row.id,
				photoUrl,
				work: row.Works || "",
				location,
				description: row.Comments || "",
				date: row.Date?.toISOString() ?? null,
				amount: row.Amounts,
				unit: row.Units || "",
			})),
		);
	if (!evidence.length)
		throw new Error(
			"Nevar atrast darbus: šīs lokācijas žurnāla ierakstiem nav piesaistītu attēlu.",
		);
	if (evidence.length > VISUAL_MAX_PHOTOS)
		throw new Error(
			`Lokācijai ir vairāk nekā ${VISUAL_MAX_PHOTOS} attēlu. Sadaliet to precīzākās lokācijās.`,
		);
	const state: VisualState = {
		version: 1,
		location,
		status: "uploaded",
		pageCount: null,
		processed: 0,
		evidence,
		marks: [],
		unlocated: [],
		error: null,
		lockedAt: null,
		attempts: [],
	};
	return prisma.$transaction(async (tx) => {
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`visual:${args.siteId}`}))`;
		const existing = (
			await tx.documents.findMany({
				where: {
					siteId: args.siteId,
					organizationId: access.organizationId,
					documentType: VISUAL_DOCUMENT_TYPE,
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			})
		).filter((row) => locationMatches(row.description, location));
		if (existing.length && args.replaceDrawingId !== existing[0].id)
			throw new Error("Lokācijai jau ir rasējums. Apstipriniet tā aizstāšanu.");
		if (!existing.length && args.replaceDrawingId)
			throw new Error(
				"Aizstājamais rasējums ir mainīts. Pārlādējiet Visual skatu.",
			);
		for (const previous of existing) {
			requireIdleDrawing(
				visualStateSchema.parse(JSON.parse(previous.description)),
			);
			const archived = await tx.documents.updateMany({
				where: {
					id: previous.id,
					siteId: args.siteId,
					organizationId: access.organizationId,
					documentType: VISUAL_DOCUMENT_TYPE,
					description: previous.description,
				},
				data: { documentType: archivedVisualType },
			});
			if (archived.count !== 1)
				throw new Error("Rasējums jau ir mainīts. Pārlādējiet Visual skatu.");
		}
		const drawing = await tx.documents.create({
			data: {
				id: randomUUID(),
				siteId: args.siteId,
				organizationId: access.organizationId,
				userId: args.userId,
				url: args.url,
				documentName: args.name,
				documentType: VISUAL_DOCUMENT_TYPE,
				description: JSON.stringify(visualStateSchema.parse(state)),
			},
		});
		return drawing.id;
	});
}

export async function loadVisualDrawing(
	userId: string,
	siteId: string,
	id: string,
) {
	const access = await requireVisualAccess(userId, siteId);
	const row = await prisma.documents.findFirst({
		where: {
			id,
			siteId,
			organizationId: access.organizationId,
			documentType: VISUAL_DOCUMENT_TYPE,
		},
	});
	if (!row) throw new Error("Rasējums nav atrasts vai nav pieejams.");
	const state = visualStateSchema.parse(JSON.parse(row.description));
	return {
		row,
		drawing: {
			id: row.id,
			name: row.documentName,
			createdAt: row.createdAt.toISOString(),
			state,
		} satisfies VisualDrawing,
	};
}

export async function saveVisualState(
	row: {
		id: string;
		siteId: string | null;
		organizationId: string | null;
		description: string;
	},
	state: VisualState,
) {
	const description = JSON.stringify(visualStateSchema.parse(state));
	const result = await prisma.documents.updateMany({
		where: {
			id: row.id,
			siteId: row.siteId,
			organizationId: row.organizationId,
			documentType: VISUAL_DOCUMENT_TYPE,
			description: row.description,
		},
		data: { description },
	});
	if (result.count !== 1)
		throw new Error("Analīze jau tiek atjaunināta. Pārlādējiet Visual skatu.");
	return { ...row, description };
}

function requireIdleDrawing(state: VisualState) {
	if (state.lockedAt && Date.now() - state.lockedAt < VISUAL_LEASE_MS)
		throw new Error("Analīze vēl notiek. Uzgaidiet, līdz tā ir pabeigta.");
}

export async function removeVisualDrawing(
	userId: string,
	siteId: string,
	id: string,
) {
	const { row, drawing } = await loadVisualDrawing(userId, siteId, id);
	requireIdleDrawing(drawing.state);
	await prisma.$transaction(async (tx) => {
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`visual:${siteId}`}))`;
		const duplicates = (
			await tx.documents.findMany({
				where: {
					siteId,
					organizationId: row.organizationId,
					documentType: VISUAL_DOCUMENT_TYPE,
				},
			})
		).filter(
			(item) =>
				item.id !== id &&
				locationMatches(item.description, drawing.state.location),
		);
		for (const item of duplicates) {
			requireIdleDrawing(visualStateSchema.parse(JSON.parse(item.description)));
			const result = await tx.documents.updateMany({
				where: {
					id: item.id,
					siteId,
					organizationId: row.organizationId,
					documentType: VISUAL_DOCUMENT_TYPE,
					description: item.description,
				},
				data: { documentType: archivedVisualType },
			});
			if (result.count !== 1)
				throw new Error("Rasējums jau ir mainīts. Pārlādējiet Visual skatu.");
		}
		const result = await tx.documents.deleteMany({
			where: {
				id: row.id,
				siteId: row.siteId,
				organizationId: row.organizationId,
				documentType: VISUAL_DOCUMENT_TYPE,
				description: row.description,
			},
		});
		if (result.count !== 1)
			throw new Error("Rasējums jau ir mainīts. Pārlādējiet Visual skatu.");
	});
}

export async function editVisualPolygon(
	userId: string,
	siteId: string,
	drawingId: string,
	input: unknown,
) {
	const edit = polygonEditSchema.parse(input);
	const { row, drawing } = await loadVisualDrawing(userId, siteId, drawingId);
	requireIdleDrawing(drawing.state);
	const mark = drawing.state.marks.find((item) => item.id === edit.markId);
	if (!mark) throw new Error("Zona nav atrasta.");
	if (JSON.stringify(mark.polygon) !== JSON.stringify(edit.expectedPolygon))
		throw new Error(
			"Zona jau ir mainīta. Pārlādējiet rasējumu pirms rediģēšanas.",
		);
	mark.polygon = edit.polygon;
	mark.editedAt = new Date().toISOString();
	mark.editedBy = userId;
	await saveVisualState(row, drawing.state);
	return drawing;
}

export async function resetVisualDrawing(
	userId: string,
	siteId: string,
	id: string,
) {
	const { row, drawing } = await loadVisualDrawing(userId, siteId, id);
	requireIdleDrawing(drawing.state);
	const state: VisualState = {
		...drawing.state,
		status: "uploaded",
		processed: 0,
		marks: [],
		unlocated: [],
		error: null,
		lockedAt: null,
		attempts: drawing.state.attempts.map((attempt) =>
			attempt.status === "running"
				? { ...attempt, status: "failed", endedAt: new Date().toISOString() }
				: attempt,
		),
	};
	await saveVisualState(row, state);
	return { ...drawing, state };
}
