import { prisma } from "@/lib/utils/db";
import { getString } from "@/lib/utils/whatsapp-helpers/shared/helpers";
import {
  buildDrawingMetadata,
  extractDrawingInfo,
  findFirstMediaIndex,
  findMediaIndexes,
  formatExtractedWorksForMessage,
  isZtcTimeoutError,
  parseJsonObject,
  polishZtcCommentText,
  sendZtcMessage,
  transcribeAudioWithSource,
  uploadMediaImage,
  workerFullName,
  ZTC_ORGANIZATION_ID,
  ZTC_SITE_ID,
  type ZtcWorker,
} from "@/app/api/webhook/meta/webhook/ZTC/ztc-workflow";

const QA_PENDING_PREFIX = "__ZTC_QA_PENDING__";
const QA_COMPLETED_PHOTO_BATCH_PREFIX = "__ZTC_QA_COMPLETED_PHOTO_BATCH__";
const QA_COMPLETED_PHOTO_BATCH_WINDOW_MS = 45_000;
const QA_PENDING_PHOTO_PROMPT_WINDOW_MS = 45_000;
const QA_WORK_LABEL = "Kvalitātes kontrole";

type QaPendingPayload = {
  drawingPhotoUrl: string;
  drawingMetadata: ReturnType<typeof buildDrawingMetadata>;
  qualityText?: string | null;
  qualityPhotoUrls?: string[];
  qualityPhotoPromptAt?: number | null;
  originalAudioUrl?: string | null;
};

function normalizeRole(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function isZtcQualityWorkerRole(value: string | null | undefined) {
  const role = normalizeRole(value);
  return [
    "qa",
    "qc",
    "quality",
    "quality_control",
    "quality_controller",
    "quality_check",
    "kvalitate",
    "kvalitāte",
    "kvalitates_kontrole",
    "kvalitātes_kontrole",
  ].includes(role);
}

function readPendingPayload(value: string | null | undefined): QaPendingPayload | null {
  if (!value?.startsWith(QA_PENDING_PREFIX)) return null;
  return parseJsonObject<QaPendingPayload | null>(value.slice(QA_PENDING_PREFIX.length).trim(), null);
}

function makePendingState(payload: QaPendingPayload) {
  return `${QA_PENDING_PREFIX} ${JSON.stringify(payload)}`;
}

function makeCompletedPhotoBatchState(now = Date.now()) {
  return `${QA_COMPLETED_PHOTO_BATCH_PREFIX} ${now}`;
}

function isRecentCompletedPhotoBatch(value: string | null | undefined, now = Date.now()) {
  if (!value?.startsWith(QA_COMPLETED_PHOTO_BATCH_PREFIX)) return false;
  const savedAt = Number(value.slice(QA_COMPLETED_PHOTO_BATCH_PREFIX.length).trim());
  return Number.isFinite(savedAt) && now - savedAt < QA_COMPLETED_PHOTO_BATCH_WINDOW_MS;
}

function isUsefulQaText(text: string) {
  const trimmed = text.trim();
  return trimmed.length >= 3 && /[\p{L}\p{N}]/u.test(trimmed);
}

function shouldSendPendingPhotoPrompt(payload: QaPendingPayload, now = Date.now()) {
  const promptedAt = Number(payload.qualityPhotoPromptAt ?? 0);
  return !Number.isFinite(promptedAt) || promptedAt <= 0 || now - promptedAt >= QA_PENDING_PHOTO_PROMPT_WINDOW_MS;
}

async function uploadQualityImages(formData: FormData, idxs: number[], context: string) {
  const results = await Promise.allSettled(idxs.map((idx) => uploadMediaImage(formData, idx)));
  const uploaded = results
    .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof uploadMediaImage>>> => result.status === "fulfilled")
    .map((result) => result.value);
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length > 0) {
    console.warn("[ZTC QA]", {
      event: "quality_photo_upload_partial_failure",
      context,
      requestedPhotoCount: idxs.length,
      uploadedPhotoCount: uploaded.length,
      failedPhotoCount: failed.length,
      errors: failed.map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason)),
    });
  }

  return uploaded;
}

function getPendingQaSession(workerId: string) {
  return prisma.sitediaryrecords.findFirst({
    where: {
      workerId,
      organizationId: ZTC_ORGANIZATION_ID,
      Date_Custom_2: null,
      Comments_Custom_1: { startsWith: QA_PENDING_PREFIX },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getRecentCompletedQaSession(workerId: string) {
  const cutoff = new Date(Date.now() - QA_COMPLETED_PHOTO_BATCH_WINDOW_MS);
  const session = await prisma.sitediaryrecords.findFirst({
    where: {
      workerId,
      organizationId: ZTC_ORGANIZATION_ID,
      Date_Custom_2: { gte: cutoff },
      Comments_Custom_1: { startsWith: QA_COMPLETED_PHOTO_BATCH_PREFIX },
      Comments_Custom_2: { contains: "\"type\":\"ztc_quality_check\"" },
    },
    orderBy: { Date_Custom_2: "desc" },
  });

  return isRecentCompletedPhotoBatch(session?.Comments_Custom_1) ? session : null;
}

function findCheckedWork(payload: QaPendingPayload, text: string) {
  const element = payload.drawingMetadata.elements[0];
  const normalizedText = text.toLowerCase();
  const prefixMatch = text.match(/\b(R[1-5]|TL|L[1-5])\b/i)?.[1]?.toUpperCase();

  if (prefixMatch) {
    const matchedByPrefix = element?.works.find((work) =>
      work.name.toUpperCase().startsWith(prefixMatch),
    );
    if (matchedByPrefix) return matchedByPrefix.name;
  }

  if (/\b(karkas\w*|timber\s*frame|koka\s*karkas\w*)\b/i.test(text)) {
    const tl = element?.works.find((work) => /^TL(\b|\s*[-/])/i.test(work.name));
    if (tl) return tl.name;
  }

  return element?.works.find((work) => {
    const parts = work.name
      .toLowerCase()
      .split(/[^a-z0-9āčēģīķļņšūž]+/i)
      .filter((part) => part.length >= 4);
    return parts.some((part) => normalizedText.includes(part));
  })?.name ?? null;
}

function buildQualityMetadata(args: {
  payload: QaPendingPayload;
  qualityPhotoUrls: string[];
  qualityText: string;
  checkedWork: string | null;
}) {
  return {
    type: "ztc_quality_check",
    version: 1,
    source: "whatsapp",
    drawingPhotoUrl: args.payload.drawingPhotoUrl,
    qualityPhotoUrls: args.qualityPhotoUrls,
    projectName: args.payload.drawingMetadata.projectName,
    elementName: args.payload.drawingMetadata.elements[0]?.elementName ?? "",
    checkedWork: args.checkedWork,
    qualityText: args.qualityText,
  };
}

async function saveQualityPhotos(args: {
  worker: ZtcWorker;
  payload: QaPendingPayload;
  urls: string[];
}) {
  if (!args.urls.length) return;

  await prisma.photos.createMany({
    data: args.urls.map((url) => ({
      Date: new Date(),
      URL: url,
      fileUrl: url,
      Comment: [
        QA_WORK_LABEL,
        args.payload.drawingMetadata.projectName,
        args.payload.drawingMetadata.elements[0]?.elementName,
        workerFullName(args.worker),
      ]
        .filter(Boolean)
        .join(" - "),
      Location: args.payload.drawingMetadata.projectName || null,
      workerId: args.worker.id,
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
    })),
  });
}

async function completeQualitySession(args: {
  session: Awaited<ReturnType<typeof getPendingQaSession>>;
  worker: ZtcWorker;
  to: string | null;
  payload: QaPendingPayload;
}) {
  if (!args.session) return;

  const qualityText = args.payload.qualityText?.trim() ?? "";
  const qualityPhotoUrls = args.payload.qualityPhotoUrls ?? [];
  if (!qualityText || qualityPhotoUrls.length === 0) return;

  const polishedQualityText = await polishZtcCommentText(qualityText);
  const checkedWork = findCheckedWork(args.payload, polishedQualityText);
  const metadata = buildQualityMetadata({
    payload: args.payload,
    qualityPhotoUrls,
    qualityText: polishedQualityText,
    checkedWork,
  });
  const elementName = args.payload.drawingMetadata.elements[0]?.elementName ?? "";
  const comments = [
    `Kvalitātes kontrole: ${polishedQualityText}`,
    checkedWork ? `Darbs: ${checkedWork}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const updated = await prisma.sitediaryrecords.update({
    where: { id: args.session.id },
    data: {
      Date_Custom_2: new Date(),
      Location: args.payload.drawingMetadata.projectName,
      Location_Custom_1: elementName,
      Works: QA_WORK_LABEL,
      Units: null,
      Amounts: null,
      TimeInvolved: null,
      Comments: comments,
      Comments_Custom_1: makeCompletedPhotoBatchState(),
      Comments_Custom_2: JSON.stringify(metadata),
      Photos: [args.payload.drawingPhotoUrl, ...qualityPhotoUrls],
      originalUserComment: `${workerFullName(args.worker)} : ${qualityText}`,
      originalAudioUrl: args.payload.originalAudioUrl ?? undefined,
    },
  });

  await saveQualityPhotos({
    worker: args.worker,
    payload: args.payload,
    urls: qualityPhotoUrls,
  });

  console.log("[ZTC QA]", {
    event: "quality_check_saved",
    sitediaryrecordId: updated.id,
    workerId: args.worker.id,
    project: updated.Location,
    element: updated.Location_Custom_1,
    checkedWork,
    qualityPhotoCount: qualityPhotoUrls.length,
  });

  await sendZtcMessage(
    args.to,
    `Kvalitātes kontrole saglabāta.\nProjekts: ${updated.Location}\nElements: ${updated.Location_Custom_1}${checkedWork ? `\nDarbs: ${checkedWork}` : ""}`,
  );
}

async function appendPhotosToRecentCompletedQaSession(args: {
  formData: FormData;
  idxs: number[];
  worker: ZtcWorker;
}) {
  const session = await getRecentCompletedQaSession(args.worker.id);
  if (!session) return false;

  const metadata = parseJsonObject<{
    type?: string;
    drawingPhotoUrl?: string;
    qualityPhotoUrls?: string[];
  }>(session.Comments_Custom_2, {});
  if (metadata.type !== "ztc_quality_check") return false;

  const images = await uploadQualityImages(args.formData, args.idxs, "recent_completed_append");
  const uploadedUrls = images.map((image) => image.publicUrl);
  if (uploadedUrls.length === 0) {
    console.warn("[ZTC QA]", {
      event: "quality_late_photos_append_skipped",
      sitediaryrecordId: session.id,
      workerId: args.worker.id,
      requestedPhotoCount: args.idxs.length,
    });
    return true;
  }

  const nextQualityPhotoUrls = [...(metadata.qualityPhotoUrls ?? []), ...uploadedUrls];
  const nextMetadata = {
    ...metadata,
    qualityPhotoUrls: nextQualityPhotoUrls,
  };
  const nextPhotos = [
    metadata.drawingPhotoUrl,
    ...nextQualityPhotoUrls,
  ].filter((url): url is string => Boolean(url));

  const payload: QaPendingPayload = {
    drawingPhotoUrl: metadata.drawingPhotoUrl ?? session.Photos?.[0] ?? "",
    drawingMetadata: {
      type: "ztc_drawing_context",
      version: 1,
      projectName: session.Location ?? "",
      elements: [
        {
          elementName: session.Location_Custom_1 ?? "",
          totalAreaM2: null,
          works: [],
        },
      ],
    },
    qualityPhotoUrls: nextQualityPhotoUrls,
  };

  await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Photos: nextPhotos,
      Comments_Custom_1: makeCompletedPhotoBatchState(),
      Comments_Custom_2: JSON.stringify(nextMetadata),
    },
  });

  await saveQualityPhotos({
    worker: args.worker,
    payload,
    urls: uploadedUrls,
  });

  console.log("[ZTC QA]", {
    event: "quality_late_photos_appended",
    sitediaryrecordId: session.id,
    workerId: args.worker.id,
    addedPhotoCount: uploadedUrls.length,
  });

  return true;
}

async function handleQualityDrawingPhoto(args: {
  formData: FormData;
  idx: number;
  to: string | null;
  worker: ZtcWorker;
}) {
  const existing = await getPendingQaSession(args.worker.id);
  if (existing) {
    await sendZtcMessage(args.to, "Jums jau ir iesākta kvalitātes kontrole. Lūdzu, pabeidziet to ar kvalitātes foto un aprakstu.");
    return;
  }

  const image = await uploadMediaImage(args.formData, args.idx);
  const extraction = await extractDrawingInfo(image.publicUrl);

  if (
    !extraction.isConstructionDrawing ||
    !extraction.qualityOk ||
    !extraction.hasReadableProjectName ||
    !extraction.hasReadableElementName ||
    !extraction.hasReadableWorkList ||
    !extraction.projectName ||
    !extraction.elementName
  ) {
    await sendZtcMessage(
      args.to,
      "Lūdzu, atsūtiet skaidru ražošanas rasējuma foto. Neizdevās nolasīt projektu, elementu vai darbu sarakstu.",
    );
    return;
  }

  const drawingMetadata = buildDrawingMetadata(extraction);
  const payload: QaPendingPayload = {
    drawingPhotoUrl: image.publicUrl,
    drawingMetadata,
    qualityPhotoUrls: [],
  };

  const created = await prisma.sitediaryrecords.create({
    data: {
      workerId: args.worker.id,
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
      Date: new Date(),
      Date_Custom_1: new Date(),
      Location: extraction.projectName,
      Location_Custom_1: extraction.elementName,
      Works: QA_WORK_LABEL,
      Comments_Custom_1: makePendingState(payload),
      originalUserComment: `${workerFullName(args.worker)} : kvalitātes kontroles rasējuma foto`,
      Photos: [image.publicUrl],
    },
  });

  console.log("[ZTC QA]", {
    event: "quality_drawing_context_created",
    sitediaryrecordId: created.id,
    workerId: args.worker.id,
    project: extraction.projectName,
    element: extraction.elementName,
  });

  await sendZtcMessage(
    args.to,
    `Rasējums pieņemts kvalitātes kontrolei.\nProjekts: ${extraction.projectName}\nElements: ${extraction.elementName}\nDarbi:\n${formatExtractedWorksForMessage(extraction)}\n\nTagad atsūtiet kvalitātes foto un balss ziņu vai tekstu ar aprakstu.`,
  );
}

async function handleQualityPhotos(args: {
  formData: FormData;
  idxs: number[];
  to: string | null;
  worker: ZtcWorker;
  caption: string;
}) {
  const session = await getPendingQaSession(args.worker.id);
  const payload = readPendingPayload(session?.Comments_Custom_1);

  if (!session || !payload) {
    await sendZtcMessage(args.to, "Lūdzu, sāciet kvalitātes kontroli ar ražošanas rasējuma foto.");
    return;
  }

  const images = await uploadQualityImages(args.formData, args.idxs, "pending_quality_photos");
  const qualityPhotoUrls = [...(payload.qualityPhotoUrls ?? []), ...images.map((image) => image.publicUrl)];
  if (images.length === 0) {
    await sendZtcMessage(args.to, "Neizdevās saglabāt kvalitātes foto. Lūdzu, atsūtiet foto vēlreiz.");
    return;
  }

  const now = Date.now();
  const shouldPrompt = shouldSendPendingPhotoPrompt(payload, now);
  const nextPayload: QaPendingPayload = {
    ...payload,
    qualityText: args.caption.trim() || payload.qualityText || null,
    qualityPhotoUrls,
    qualityPhotoPromptAt: shouldPrompt ? now : payload.qualityPhotoPromptAt ?? null,
  };

  await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Comments_Custom_1: makePendingState(nextPayload),
      Photos: [payload.drawingPhotoUrl, ...qualityPhotoUrls],
    },
  });

  if (nextPayload.qualityText) {
    await completeQualitySession({
      session,
      worker: args.worker,
      to: args.to,
      payload: nextPayload,
    });
    return;
  }

  if (shouldPrompt) {
    await sendZtcMessage(args.to, "Kvalitātes foto saņemts. Lūdzu, atsūtiet balss ziņu vai tekstu ar kvalitātes aprakstu.");
  }
}

async function handleQualityText(args: {
  text: string;
  to: string | null;
  worker: ZtcWorker;
  originalAudioUrl?: string | null;
}) {
  const session = await getPendingQaSession(args.worker.id);
  const payload = readPendingPayload(session?.Comments_Custom_1);

  if (!session || !payload) {
    await sendZtcMessage(args.to, "Lūdzu, sāciet kvalitātes kontroli ar ražošanas rasējuma foto.");
    return;
  }

  if (!isUsefulQaText(args.text)) {
    await sendZtcMessage(args.to, "Neizdevās saprast kvalitātes aprakstu. Lūdzu, mēģiniet vēlreiz ar balss ziņu vai tekstu.");
    return;
  }

  const nextPayload: QaPendingPayload = {
    ...payload,
    qualityText: args.text.trim(),
    originalAudioUrl: payload.originalAudioUrl ?? args.originalAudioUrl ?? null,
  };

  await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Comments_Custom_1: makePendingState(nextPayload),
    },
  });

  if ((nextPayload.qualityPhotoUrls ?? []).length > 0) {
    await completeQualitySession({
      session,
      worker: args.worker,
      to: args.to,
      payload: nextPayload,
    });
    return;
  }

  await sendZtcMessage(args.to, "Kvalitātes apraksts saņemts. Lūdzu, atsūtiet kvalitātes kontroles foto.");
}

export async function handleZtcQualityRoute(args: {
  formData: FormData;
  worker: ZtcWorker;
}) {
  const { formData, worker } = args;
  const from = getString(formData, "From");
  const body = (getString(formData, "Body") || "").trim();
  const numMedia = Number(getString(formData, "NumMedia") || "0") || 0;
  const imageIndexes = findMediaIndexes(formData, numMedia, "image/");
  const imageIdx = imageIndexes[0] ?? -1;
  const audioIdx = findFirstMediaIndex(formData, numMedia, "audio/");

  try {
    if (imageIndexes.length > 0) {
      const pending = await getPendingQaSession(worker.id);
      if (pending) {
        await handleQualityPhotos({ formData, idxs: imageIndexes, to: from, worker, caption: body });
      } else if (await appendPhotosToRecentCompletedQaSession({ formData, idxs: imageIndexes, worker })) {
        // Additional QA photos sent as separate WhatsApp messages were attached silently.
      } else {
        await handleQualityDrawingPhoto({ formData, idx: imageIdx, to: from, worker });
      }
      return;
    }

    if (audioIdx >= 0) {
      const transcript = await transcribeAudioWithSource(formData, audioIdx);
      await handleQualityText({
        text: transcript.text,
        to: from,
        worker,
        originalAudioUrl: transcript.originalAudioUrl,
      });
      return;
    }

    if (body) {
      await handleQualityText({ text: body, to: from, worker });
      return;
    }

    await sendZtcMessage(from, "Lūdzu, sāciet kvalitātes kontroli ar ražošanas rasējuma foto.");
  } catch (error) {
    console.error("[ZTC QA] failed", error);
    await sendZtcMessage(
      from,
      isZtcTimeoutError(error) || imageIdx >= 0
        ? "Tīkla vai foto apstrādes kļūda. Lūdzu, atsūtiet foto vēlreiz."
        : "Atvainojiet, kvalitātes kontroles plūsma nevarēja apstrādāt šo ziņu. Lūdzu, mēģiniet vēlreiz.",
    );
  }
}
