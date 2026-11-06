import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import ztcSiteDiaryRecordsMap from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";
import { ZTC_CANCELLED_SESSION_PREFIX } from "@/flows/ztc-production/lib/ztc-session-markers";
import type { ZtcDiaryRow } from "@/flows/ztc-production/lib/ztc-site-diary-utils";
import type {
	ZtcWorkspaceData,
	ZtcWorkspaceResult,
	ZtcWorkspaceRevisions,
	ZtcWorkspaceSync,
} from "@/flows/ztc-production/lib/ztc-workspace-data";
import { ztcRevisionsEqual } from "@/flows/ztc-production/lib/ztc-workspace-sync";
import { siteDiaryPhotoPurposeWhere } from "@/lib/photos/media-purpose";

type Scope = { siteId: string; organizationId: string };
type RowMetadata = {
	id: string;
	revision: string;
	Date: Date;
	Date_Custom_1: Date | null;
	Location: string | null;
};
type Metadata = { rows: RowMetadata[]; revisions: ZtcWorkspaceRevisions };
type Loaders = {
	rows: (
		tx: Prisma.TransactionClient,
		scope: Scope,
		ids?: string[],
	) => Promise<ZtcDiaryRow[]>;
	config: (
		tx: Prisma.TransactionClient,
		siteId: string,
	) => Promise<Record<string, unknown>>;
	rates: (config: Record<string, unknown>) => ZtcWorkspaceData["rates"];
};
const hash = (value: unknown) =>
	createHash("sha256").update(JSON.stringify(value)).digest("hex");
const formatVersion = hash([1, ztcSiteDiaryRecordsMap]);

export async function loadZtcSyncMetadata(
	tx: Prisma.TransactionClient,
	scope: Scope,
): Promise<Metadata> {
	const rows = await tx.$queryRaw<RowMetadata[]>`
		SELECT r.id, COALESCE(a.id::text, '0') || ':' || md5(jsonb_build_array(u."firstName", u."lastName", w.name, w.surname)::text) AS revision,
			r."Date", r."Date_Custom_1", r."Location"
		FROM "ZTCrecords" r
		LEFT JOIN "User" u ON u.id = r."userId"
		LEFT JOIN workers w ON w.id = r."workerId"
		LEFT JOIN LATERAL (SELECT id FROM "ZtcRecordAudit" WHERE "recordId" = r.id ORDER BY id DESC LIMIT 1) a ON true
		WHERE r."siteId" = ${scope.siteId} AND r."organizationId" = ${scope.organizationId}
			AND r."Date_Custom_2" IS NOT NULL AND r."Date" IS NOT NULL AND r."Works" IS NOT NULL AND r."Works" <> ''
			AND (r."Comments_Custom_1" IS NULL OR left(r."Comments_Custom_1", length(${ZTC_CANCELLED_SESSION_PREFIX})) <> ${ZTC_CANCELLED_SESSION_PREFIX})
		ORDER BY r."Date" DESC, r."Date_Custom_1" DESC, r."createdAt" DESC, r.id DESC
	`;
	const [sections] = await tx.$queryRaw<{ config: string; media: string }[]>`
		SELECT md5(COALESCE((SELECT "siteDiaryRecordsMap"::text FROM "ZtcSiteConfiguration" WHERE "siteId" = ${scope.siteId}), 'null')) AS config,
			(SELECT md5(COALESCE(string_agg(md5(jsonb_build_array(p.id, p."Date", p."Comment", p."Location", p."URL", p."fileUrl")::text), '' ORDER BY p.id), ''))
			FROM "ZtcPhoto" p WHERE p."siteId" = ${scope.siteId} AND p."Date" IS NOT NULL
				AND (p."mediaPurpose" IS NULL OR p."mediaPurpose" = 'site_diary')
				AND (COALESCE(p."URL", '') <> '' OR COALESCE(p."fileUrl", '') <> '')) AS media
	`;
	return {
		rows,
		revisions: {
			rows: hash([formatVersion, rows.map((row) => [row.id, row.revision])]),
			config: hash([formatVersion, sections.config]),
			media: hash([
				formatVersion,
				sections.media,
				rows.map((row) => [row.Date, row.Date_Custom_1]),
			]),
		},
	};
}

export function readZtcSync(
	value: unknown,
	siteId: string,
): ZtcWorkspaceSync | undefined {
	if (!value || typeof value !== "object" || Array.isArray(value)) return;
	const data = value as ZtcWorkspaceSync;
	if (
		data.version !== 1 ||
		data.siteId !== siteId ||
		!data.revisions ||
		![data.revisions.rows, data.revisions.config, data.revisions.media].every(
			(item) => typeof item === "string" && /^[a-f0-9]{64}$/.test(item),
		)
	)
		return;
	for (const versions of [data.rows, data.media]) {
		if (!versions || typeof versions !== "object" || Array.isArray(versions))
			return;
		const entries = Object.entries(versions);
		if (
			entries.length > 100000 ||
			entries.some(
				([id, revision]) =>
					!id ||
					id.length > 200 ||
					typeof revision !== "string" ||
					revision.length > 100,
			)
		)
			return;
	}
	return data;
}

function dayKey(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function loadMedia(
	tx: Prisma.TransactionClient,
	scope: Scope,
	rows: RowMetadata[],
): Promise<ZtcWorkspaceData["mediaOnlyDays"]> {
	const photos = await tx.ztcPhoto.findMany({
		where: {
			siteId: scope.siteId,
			Date: { not: null },
			AND: [siteDiaryPhotoPurposeWhere()],
			OR: [
				{ AND: [{ URL: { not: null } }, { URL: { not: "" } }] },
				{ AND: [{ fileUrl: { not: null } }, { fileUrl: { not: "" } }] },
			],
		},
		orderBy: [{ Date: "desc" }, { id: "desc" }],
		select: { Date: true, Comment: true, Location: true },
	});
	const recordDays = new Set(
		rows.flatMap((row) => [
			dayKey(row.Date),
			...(row.Date_Custom_1 ? [dayKey(row.Date_Custom_1)] : []),
		]),
	);
	const days = new Map<string, ZtcWorkspaceData["mediaOnlyDays"][number]>();
	for (const photo of photos) {
		if (!photo.Date) continue;
		const key = dayKey(photo.Date);
		const day = days.get(key);
		if (day) {
			day.photoCount++;
			day.searchableText = [day.searchableText, photo.Comment, photo.Location]
				.filter(Boolean)
				.join(" ");
		} else
			days.set(key, {
				key,
				date: photo.Date,
				latestPhotoDate: photo.Date,
				photoCount: 1,
				searchableText: [photo.Comment, photo.Location]
					.filter(Boolean)
					.join(" "),
				hasDiaryRecords: recordDays.has(key),
			});
	}
	return [...days.values()];
}

export async function loadZtcWorkspaceSync(
	tx: Prisma.TransactionClient,
	scope: Scope,
	input: unknown,
	loaders: Loaders,
): Promise<ZtcWorkspaceResult> {
	const known = readZtcSync(input, scope.siteId);
	const metadata = await loadZtcSyncMetadata(tx, scope);
	if (known && ztcRevisionsEqual(known.revisions, metadata.revisions))
		return { status: "unchanged", siteId: scope.siteId };
	const rowVersions = Object.fromEntries(
		metadata.rows.map((row) => [row.id, row.revision]),
	);
	const changedIds = metadata.rows
		.filter((row) => !known || known.rows[row.id] !== row.revision)
		.map((row) => row.id);
	const rows = changedIds.length
		? await loaders.rows(tx, scope, changedIds)
		: [];
	const config =
		!known || known.revisions.config !== metadata.revisions.config
			? await loaders.config(tx, scope.siteId)
			: undefined;
	const media =
		!known || known.revisions.media !== metadata.revisions.media
			? await loadMedia(tx, scope, metadata.rows)
			: undefined;
	const mediaVersions = media
		? Object.fromEntries(media.map((day) => [day.key, hash(day)]))
		: (known?.media ?? {});
	const sync: ZtcWorkspaceSync = {
		version: 1,
		siteId: scope.siteId,
		revisions: metadata.revisions,
		rows: rowVersions,
		media: mediaVersions,
	};
	const projectOptions = Array.from(
		new Set(
			metadata.rows
				.map((row) => row.Location?.trim())
				.filter((name): name is string =>
					Boolean(name && name !== "Papilddarbi"),
				),
		),
	).sort((a, b) => a.localeCompare(b, "lv"));
	if (!known)
		return {
			status: "ok",
			data: {
				siteId: scope.siteId,
				rows,
				config: config ?? {},
				rates: loaders.rates(config ?? {}),
				projectOptions,
				mediaOnlyDays: media ?? [],
				sync,
			},
		};
	const changedMedia =
		media?.filter((day) => known.media[day.key] !== mediaVersions[day.key]) ??
		[];
	const rowOrder = metadata.rows.map((row) => row.id);
	const previousOrder = Object.keys(known.rows).filter((id) =>
		Object.hasOwn(rowVersions, id),
	);
	const mediaOrder = media?.map((day) => day.key);
	const previousMediaOrder = Object.keys(known.media).filter((key) =>
		Object.hasOwn(mediaVersions, key),
	);
	return {
		status: "delta",
		siteId: scope.siteId,
		sync: { version: 1, siteId: scope.siteId, revisions: sync.revisions },
		changedRows: rows,
		rowVersions: Object.fromEntries(
			changedIds.map((id) => [id, rowVersions[id]]),
		),
		mediaVersions: Object.fromEntries(
			changedMedia.map((day) => [day.key, mediaVersions[day.key]]),
		),
		deletedRowIds: Object.keys(known.rows).filter(
			(id) => !Object.hasOwn(rowVersions, id),
		),
		...(JSON.stringify(rowOrder) !== JSON.stringify(previousOrder)
			? { rowOrder }
			: {}),
		...(config ? { config, rates: loaders.rates(config) } : {}),
		...(known.revisions.rows !== sync.revisions.rows ? { projectOptions } : {}),
		changedMedia,
		deletedMediaKeys: Object.keys(known.media).filter(
			(key) => !Object.hasOwn(mediaVersions, key),
		),
		...(mediaOrder &&
		JSON.stringify(mediaOrder) !== JSON.stringify(previousMediaOrder)
			? { mediaOrder }
			: {}),
	};
}
