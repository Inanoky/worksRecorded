export const PHOTO_COMMENT_BACKFILL_SOURCE_PREFIX = "photo-comment-backfill:";

export type PhotoCommentBackfillArgs = {
  siteId: string;
  userId: string;
  startDate: string;
  endDate: string;
  minCommentLength: number;
};

export type PhotoCommentBackfillCandidateLike = {
  id: string;
  Date: Date | string | null;
  Comment: string | null;
  siteId?: string | null;
  userId?: string | null;
};

export function getPhotoCommentBackfillSourceMessageId(photoId: string) {
  return `${PHOTO_COMMENT_BACKFILL_SOURCE_PREFIX}${photoId}`;
}

export function normalizePhotoComment(comment: string | null | undefined) {
  return comment?.trim() ?? "";
}

export function isEligiblePhotoComment(comment: string | null | undefined, minCommentLength: number) {
  return normalizePhotoComment(comment).length >= minCommentLength;
}

export function isPhotoCommentInDateRange(
  value: Date | string | null | undefined,
  startDate: string,
  endDate: string,
) {
  if (!value) return false;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const isoDay = date.toISOString().slice(0, 10);
  return isoDay >= startDate && isoDay <= endDate;
}

export function shouldIncludePhotoCommentCandidate(args: {
  photo: PhotoCommentBackfillCandidateLike;
  filter: PhotoCommentBackfillArgs;
  existingSourceMessageIds?: Set<string>;
}) {
  const { photo, filter, existingSourceMessageIds = new Set<string>() } = args;
  if (photo.siteId != null && photo.siteId !== filter.siteId) return false;
  if (photo.userId != null && photo.userId !== filter.userId) return false;
  if (!isPhotoCommentInDateRange(photo.Date, filter.startDate, filter.endDate)) return false;
  if (!isEligiblePhotoComment(photo.Comment, filter.minCommentLength)) return false;
  return !existingSourceMessageIds.has(getPhotoCommentBackfillSourceMessageId(photo.id));
}

function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''");
}

export function buildPhotoCommentBackfillCandidateSql(args: PhotoCommentBackfillArgs) {
  const siteId = escapeSqlLiteral(args.siteId);
  const userId = escapeSqlLiteral(args.userId);
  const startDate = escapeSqlLiteral(args.startDate);
  const endDate = escapeSqlLiteral(args.endDate);
  const minCommentLength = Number.isFinite(args.minCommentLength)
    ? Math.max(1, Math.trunc(args.minCommentLength))
    : 25;

  return `SELECT
  p."id",
  p."Date",
  p."Comment",
  p."URL",
  p."fileUrl"
FROM "photos" p
WHERE p."siteId" = '${siteId}'
  AND p."userId" = '${userId}'
  AND p."Date" >= '${startDate} 00:00:00'
  AND p."Date" < ('${endDate}'::date + interval '1 day')
  AND nullif(trim(p."Comment"), '') IS NOT NULL
  AND char_length(trim(p."Comment")) >= ${minCommentLength}
  AND NOT EXISTS (
    SELECT 1
    FROM "SiteDiarySaveBatch" b
    WHERE b."sourceMessageId" = concat('photo-comment-backfill:', p."id")
  )
ORDER BY p."Date", p."createdAt";`;
}

export function buildPhotoCommentBackfillCountSql(args: PhotoCommentBackfillArgs) {
  return `SELECT count(*) AS candidate_count
FROM "photos" p
WHERE p."siteId" = '${escapeSqlLiteral(args.siteId)}'
  AND p."userId" = '${escapeSqlLiteral(args.userId)}'
  AND p."Date" >= '${escapeSqlLiteral(args.startDate)} 00:00:00'
  AND p."Date" < ('${escapeSqlLiteral(args.endDate)}'::date + interval '1 day')
  AND nullif(trim(p."Comment"), '') IS NOT NULL
  AND char_length(trim(p."Comment")) >= ${Math.max(1, Math.trunc(args.minCommentLength))}
  AND NOT EXISTS (
    SELECT 1
    FROM "SiteDiarySaveBatch" b
    WHERE b."sourceMessageId" = concat('photo-comment-backfill:', p."id")
  );`;
}
