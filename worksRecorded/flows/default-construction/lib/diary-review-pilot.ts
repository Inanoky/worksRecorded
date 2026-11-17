import type { Prisma } from "@prisma/client";

export const DIARY_REVIEW_PILOT_KEY = "constructionDiaryReviewPilot";

export type DiaryReviewPilot = {
  enabled: true;
  allowedSenderPhones: string[];
  allowedUserIds: string[];
};

export function normalizeDiaryReviewPhone(value: unknown) {
  if (typeof value !== "string") return null;
  const phone = value
    .trim()
    .replace(/^whatsapp:/i, "")
    .replace(/[ ()-]/g, "");
  return /^\+?[1-9]\d{7,14}$/.test(phone) ? phone.replace(/^\+/, "") : null;
}

export function getDiaryReviewPilot(config: unknown): DiaryReviewPilot | null {
  const raw = (config as { otherSettings?: Record<string, unknown> } | null)
    ?.otherSettings?.[DIARY_REVIEW_PILOT_KEY] as
    | Partial<DiaryReviewPilot>
    | undefined;
  if (
    raw?.enabled !== true ||
    !Array.isArray(raw.allowedSenderPhones) ||
    !Array.isArray(raw.allowedUserIds)
  )
    return null;
  const phones = raw.allowedSenderPhones.map(normalizeDiaryReviewPhone);
  if (
    !phones.length ||
    phones.some((phone) => !phone) ||
    !raw.allowedUserIds.length ||
    raw.allowedUserIds.some((id) => typeof id !== "string" || !id.trim())
  )
    return null;
  return {
    enabled: true,
    allowedSenderPhones: phones as string[],
    allowedUserIds: raw.allowedUserIds,
  };
}

export function diaryReviewPilotAllowsUser(
  pilot: DiaryReviewPilot | null,
  userId: string,
) {
  return Boolean(pilot?.allowedUserIds.includes(userId));
}

export function diaryReviewPilotAllowsSender(
  pilot: DiaryReviewPilot | null,
  userId: string,
  senderPhone: unknown,
) {
  const phone = normalizeDiaryReviewPhone(senderPhone);
  return Boolean(
    phone &&
      diaryReviewPilotAllowsUser(pilot, userId) &&
      pilot?.allowedSenderPhones.includes(phone),
  );
}

export function diaryReviewSourceWhere(
  pilot: DiaryReviewPilot,
): Prisma.sitediaryrecordsWhereInput {
  return {
    AND: [
      {
        evalMetadata: {
          path: ["diaryReviewSource", "channel"],
          equals: "whatsapp",
        },
      },
      {
        OR: pilot.allowedSenderPhones.map((phone) => ({
          evalMetadata: {
            path: ["diaryReviewSource", "senderPhone"],
            equals: phone,
          },
        })),
      },
    ],
  };
}

export function diaryReviewSourceMetadata(
  metadata: Record<string, unknown> | null | undefined,
  source?: { senderPhone: string; sourceMessageId: string } | null,
) {
  const safe = Object.fromEntries(
    Object.entries(metadata ?? {}).filter(
      ([key]) => key !== "diaryReviewSource",
    ),
  );
  if (source)
    safe.diaryReviewSource = {
      channel: "whatsapp",
      senderPhone: source.senderPhone,
      messageId: source.sourceMessageId,
    };
  return Object.keys(safe).length
    ? (JSON.parse(JSON.stringify(safe)) as Prisma.InputJsonObject)
    : undefined;
}
