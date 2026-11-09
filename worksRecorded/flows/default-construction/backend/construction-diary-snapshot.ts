import { Prisma } from "@prisma/client";
import { siteDiaryPhotoPurposeWhere } from "@/lib/photos/media-purpose";
import { prisma } from "@/lib/utils/db";
import {
	constructionDiaryListSelect,
	mapConstructionDiaryListRecord,
} from "./diary-list-record";

export type ConstructionDiarySnapshotOptions = {
	ids?: string[];
	media?: boolean;
	dates?: Date[];
};

type BootstrapDiaryRow = Record<string, unknown> & {
	createdAt: Date | string;
	Date: Date | string | null;
	Date_Custom_1: Date | string | null;
	Date_Custom_2: Date | string | null;
};

type BootstrapMediaPhoto = {
	Date: Date | string | null;
	Comment: string | null;
	Location: string | null;
	URL: string | null;
	fileUrl: string | null;
};

type BootstrapQueryResult = {
	rows: BootstrapDiaryRow[];
	mediaPhotos: BootstrapMediaPhoto[];
};

function reviveDate(value: Date | string | null) {
	return typeof value === "string" ? new Date(value) : value;
}
export async function readConstructionDiarySnapshot(
	siteId: string,
	organizationId: string,
	options: ConstructionDiarySnapshotOptions = {},
) {
	const [rows, mediaPhotos] = await Promise.all([
		options.ids?.length === 0
			? []
			: prisma.sitediaryrecords.findMany({
					where: {
						siteId,
						organizationId,
						archivedAt: null,
						...(options.ids ? { id: { in: options.ids } } : {}),
						...(options.dates ? { Date: { in: options.dates } } : {}),
					},
					orderBy: [{ Date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
					select: constructionDiaryListSelect,
				}),
		options.media === false
			? []
			: prisma.photos.findMany({
					where: {
						siteId,
						organizationId,
						...(options.dates ? { Date: { in: options.dates } } : {}),
						AND: [siteDiaryPhotoPurposeWhere()],
						OR: [
							{ AND: [{ URL: { not: null } }, { URL: { not: "" } }] },
							{ AND: [{ fileUrl: { not: null } }, { fileUrl: { not: "" } }] },
						],
					},
					select: {
						Date: true,
						Comment: true,
						Location: true,
						URL: true,
						fileUrl: true,
					},
				}),
	]);
	return { rows: rows.map(mapConstructionDiaryListRecord), mediaPhotos };
}

export async function readConstructionDiaryBootstrap(
	siteId: string,
	organizationId: string,
	dayCount = 3,
) {
	const [snapshot] = await prisma.$queryRaw<BootstrapQueryResult[]>(Prisma.sql`
		WITH latest_dates AS (
			SELECT r."Date"
			FROM "sitediaryrecords" r
			WHERE r."siteId" = ${siteId}
				AND r."organizationId" = ${organizationId}
				AND r."archivedAt" IS NULL
				AND r."Date" IS NOT NULL
			GROUP BY r."Date"
			ORDER BY r."Date" DESC
			LIMIT ${dayCount}
		)
		SELECT
			COALESCE((
				SELECT jsonb_agg(
					jsonb_build_object(
						'id', r.id,
						'createdAt', r."createdAt",
						'Date', r."Date",
						'Date_Custom_1', r."Date_Custom_1",
						'Date_Custom_2', r."Date_Custom_2",
						'Location', r."Location",
						'Location_Custom_1', r."Location_Custom_1",
						'Location_Custom_2', r."Location_Custom_2",
						'Works', r."Works",
						'Works_Custom_1', r."Works_Custom_1",
						'Works_Custom_2', r."Works_Custom_2",
						'Comments', r."Comments",
						'Comments_Custom_1', r."Comments_Custom_1",
						'Comments_Custom_2', r."Comments_Custom_2",
						'Units', r."Units",
						'Amounts', r."Amounts",
						'WorkersInvolved', r."WorkersInvolved",
						'TimeInvolved', r."TimeInvolved",
						'Photos', r."Photos",
						'BISId', r."BISId",
						'bisStatus', r."bisStatus",
						'originalUserComment', r."originalUserComment",
						'originalAudioUrl', r."originalAudioUrl",
						'fimaNumber', r."fimaNumber",
						'evalMetadata', r."evalMetadata",
						'User', CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object(
							'firstName', u."firstName",
							'lastName', u."lastName"
						) END,
						'Worker', CASE WHEN w.id IS NULL THEN NULL ELSE jsonb_build_object(
							'name', w.name,
							'surname', w.surname
						) END
					)
					ORDER BY r."Date" DESC, r."createdAt" DESC, r.id DESC
				)
				FROM "sitediaryrecords" r
				INNER JOIN latest_dates d ON d."Date" = r."Date"
				LEFT JOIN "User" u ON u.id = r."userId"
				LEFT JOIN "workers" w ON w.id = r."workerId"
				WHERE r."siteId" = ${siteId}
					AND r."organizationId" = ${organizationId}
					AND r."archivedAt" IS NULL
			), '[]'::jsonb) AS rows,
			COALESCE((
				SELECT jsonb_agg(jsonb_build_object(
					'Date', p."Date",
					'Comment', p."Comment",
					'Location', p."Location",
					'URL', p."URL",
					'fileUrl', p."fileUrl"
				))
				FROM "photos" p
				INNER JOIN latest_dates d ON d."Date" = p."Date"
				WHERE p."siteId" = ${siteId}
					AND p."organizationId" = ${organizationId}
					AND (p."mediaPurpose" IS NULL OR p."mediaPurpose" = 'site_diary')
					AND (
						COALESCE(p."URL", '') <> ''
						OR COALESCE(p."fileUrl", '') <> ''
					)
			), '[]'::jsonb) AS "mediaPhotos"
	`);

	return {
		rows: (snapshot?.rows ?? []).map((row) =>
			mapConstructionDiaryListRecord({
				...row,
				createdAt: reviveDate(row.createdAt),
				Date: reviveDate(row.Date),
				Date_Custom_1: reviveDate(row.Date_Custom_1),
				Date_Custom_2: reviveDate(row.Date_Custom_2),
			}),
		),
		mediaPhotos: (snapshot?.mediaPhotos ?? []).map((photo) => ({
			...photo,
			Date: reviveDate(photo.Date),
		})),
	};
}
