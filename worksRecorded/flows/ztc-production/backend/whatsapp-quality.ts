import OpenAI from "openai";
import { prisma } from "@/lib/utils/db";
import { getString } from "@/lib/utils/whatsapp-helpers/shared/helpers";
import {
  buildDrawingMetadata,
  findFirstMediaIndex,
  findMediaIndexes,
  formatExtractedWorksForMessage,
  isZtcTimeoutError,
  logZtcTiming,
  mergeOriginalAudioUrls,
  parseJsonObject,
  sendZtcMessage,
  transcribeAudioWithSource,
  uploadAndExtractDrawingInfo,
  uploadMediaImage,
  getZtcFlowContext,
  workerFullName,
  type ProductionDrawingExtractionProfile,
  type ZtcWorker,
} from "@/flows/ztc-production/backend/whatsapp-worker";
import { getZtcTaskIdentityKey } from "@/flows/ztc-production/lib/ztc-task-amount-allocation";
import { normalizeZtcProjectName } from "@/flows/ztc-production/lib/ztc-project-name";

const QA_PENDING_PREFIX = "__ZTC_QA_PENDING__";
const QA_COMPLETED_PHOTO_BATCH_PREFIX = "__ZTC_QA_COMPLETED_PHOTO_BATCH__";
const QA_COMPLETED_PHOTO_BATCH_WINDOW_MS = 45_000;
const QA_PENDING_PHOTO_PROMPT_WINDOW_MS = 45_000;
const QA_TEXT_TIMEOUT_MS = 30_000;
const QA_WORK_LABEL = "Kvalitātes kontrole";

type QaQualityStatus = "accepted" | "accepted_with_defects" | "rejected" | "unknown";

type QaQualityEvaluation = {
  status: QaQualityStatus;
  coefficient: "1" | "0.9" | "0" | null;
  summary: string | null;
  issue: string | null;
};

type QaPendingPayload = {
  drawingPhotoUrl: string;
  drawingMetadata: ReturnType<typeof buildDrawingMetadata>;
  checkedWork?: string | null;
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

function readCompletedPhotoBatchAt(value: string | null | undefined) {
  if (!value?.startsWith(QA_COMPLETED_PHOTO_BATCH_PREFIX)) return null;
  const savedAt = Number(value.slice(QA_COMPLETED_PHOTO_BATCH_PREFIX.length).trim());
  return Number.isFinite(savedAt) ? savedAt : null;
}

function isRecentCompletedPhotoBatch(value: string | null | undefined, now = Date.now()) {
  const savedAt = readCompletedPhotoBatchAt(value);
  return savedAt != null && now - savedAt < QA_COMPLETED_PHOTO_BATCH_WINDOW_MS;
}

function getMetaMessageTimestampMs(formData: FormData) {
  const raw = getString(formData, "MessageTimestamp");
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

function hasExtraPhotoCaption(caption: string | null | undefined) {
  const normalizedCaption = String(caption ?? "").trim().toLowerCase();
  return (
    /\b(papildu|vel|v[eē]l|extra|additional|late)\b/i.test(normalizedCaption) &&
    /\b(foto|photo|bild|att[eē]l)\w*\b/i.test(normalizedCaption)
  );
}

function shouldAppendToRecentCompletedQaSession(args: {
  session: Awaited<ReturnType<typeof getRecentCompletedQaSession>>;
  formData: FormData;
  caption?: string | null;
}) {
  if (hasExtraPhotoCaption(args.caption)) {
    return { shouldAppend: true, reason: "caption_requests_extra_qa_photo_append" };
  }

  const completedAt = readCompletedPhotoBatchAt(args.session?.Comments_Custom_1);
  const messageTimestampMs = getMetaMessageTimestampMs(args.formData);
  if (completedAt == null || messageTimestampMs == null) {
    return { shouldAppend: false, reason: "missing_timestamp_prefers_new_qa_drawing_flow" };
  }

  if (messageTimestampMs <= completedAt + 1000) {
    return { shouldAppend: true, reason: "image_sent_before_or_at_qa_completion" };
  }

  return { shouldAppend: false, reason: "image_sent_after_qa_completion_prefers_new_drawing_flow" };
}

function isUsefulQaText(text: string) {
  const trimmed = text.trim();
  return trimmed.length >= 3 && /[\p{L}\p{N}]/u.test(trimmed);
}

function shouldSendPendingPhotoPrompt(payload: QaPendingPayload, now = Date.now()) {
  const promptedAt = Number(payload.qualityPhotoPromptAt ?? 0);
  return !Number.isFinite(promptedAt) || promptedAt <= 0 || now - promptedAt >= QA_PENDING_PHOTO_PROMPT_WINDOW_MS;
}

function withQaTimeout<T>(promise: Promise<T>, label: string, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error(`${label} timed out after ${timeoutMs}ms`);
      error.name = "ZtcTimeoutError";
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

function normalizeQualityEvaluation(value: Partial<QaQualityEvaluation> | null | undefined): QaQualityEvaluation {
  const status: QaQualityStatus =
    value?.status === "accepted" ||
    value?.status === "accepted_with_defects" ||
    value?.status === "rejected"
      ? value.status
      : "unknown";

  return {
    status,
    coefficient:
      status === "accepted"
        ? "1"
        : status === "accepted_with_defects"
          ? "0.9"
          : status === "rejected"
            ? "0"
            : null,
    summary: String(value?.summary ?? "").trim() || null,
    issue: String(value?.issue ?? "").trim() || null,
  };
}

function fallbackQualityEvaluation(text: string): QaQualityEvaluation {
  const normalized = text.toLowerCase();

  if (/\b(nav\s+pie[ņn]em|nepie[ņn]em|neder|br[aā][ķk]|j[aā]p[aā]rtaisa|j[aā]labo|rejected|not\s+accepted|not\s+acceptable|брак|не\s+принят)/i.test(normalized)) {
    return normalizeQualityEvaluation({
      status: "rejected",
      summary: "Kvalitāte nav pieņemama.",
    });
  }

  if (/(defekt|boj[aā]j|tr[uū]kum|pie[ņn]em.*ar|akcept.*ar|accepted\s+with|defects?\s+acceptable)/i.test(normalized)) {
    return normalizeQualityEvaluation({
      status: "accepted_with_defects",
      summary: "Kvalitāte pieņemta ar defektiem.",
    });
  }

  if (/\b(k[aā]rt[iī]b[aā]|pie[ņn]emts|akcept[eē]ts|bez\s+defekt|atbilst|labi|ok|accepted|good)\b/i.test(normalized)) {
    return normalizeQualityEvaluation({
      status: "accepted",
      summary: "Kvalitāte pieņemta.",
    });
  }

  return normalizeQualityEvaluation({
    status: "unknown",
    issue: "Kvalitātes statuss nav skaidri nosakāms.",
  });
}

async function analyzeQualityMessage(text: string): Promise<{
  polishedText: string;
  evaluation: QaQualityEvaluation;
}> {
  const startedAt = Date.now();
  const normalized = text.trim();
  if (!normalized) {
    logZtcTiming("qa_message_analysis_total", startedAt, {
      textLength: 0,
      status: "unknown",
      fallback: true,
    });
    return {
      polishedText: "",
      evaluation: fallbackQualityEvaluation(normalized),
    };
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const openaiStartedAt = Date.now();
    const response = await withQaTimeout(
      openai.chat.completions.create({
        model: process.env.ZTC_TEXT_MODEL || "gpt-5.4-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Correct and evaluate a production factory quality control message in one pass. Return only JSON with keys: polishedText, status, summary, issue. polishedText must preserve the original meaning, technical terms, project names, element names, work codes, numbers, units, and names; do not add details. status must be one of: accepted, accepted_with_defects, rejected, unknown. Use accepted when quality is OK/accepted/without defects. Use accepted_with_defects when defects are mentioned but the work is still accepted/acceptable. Use rejected when quality is not accepted, needs rework, has unacceptable defects, or is rejected. Use unknown only if the message does not clearly state quality outcome. Preserve Latvian meaning in summary.",
          },
          { role: "user", content: normalized },
        ],
      }),
      "ztc_quality_message_analysis",
      QA_TEXT_TIMEOUT_MS,
    );
    logZtcTiming("qa_message_analysis_openai", openaiStartedAt, {
      model: process.env.ZTC_TEXT_MODEL || "gpt-5.4-mini",
      textLength: normalized.length,
    });

    const parsed = parseJsonObject<
      (Partial<QaQualityEvaluation> & { polishedText?: string | null }) | null
    >(response.choices[0]?.message?.content, null);
    const polishedText = String(parsed?.polishedText ?? "").trim() || normalized;
    const evaluation = normalizeQualityEvaluation(parsed);

    const result = {
      polishedText,
      evaluation: evaluation.status === "unknown"
        ? fallbackQualityEvaluation(polishedText)
        : evaluation,
    };
    logZtcTiming("qa_message_analysis_total", startedAt, {
      textLength: normalized.length,
      polishedTextLength: result.polishedText.length,
      status: result.evaluation.status,
      coefficient: result.evaluation.coefficient,
    });

    return result;
  } catch (error) {
    console.warn("[ZTC QA] quality message analysis failed", error);
    const result = {
      polishedText: normalized,
      evaluation: fallbackQualityEvaluation(normalized),
    };
    logZtcTiming("qa_message_analysis_total", startedAt, {
      textLength: normalized.length,
      polishedTextLength: result.polishedText.length,
      status: result.evaluation.status,
      coefficient: result.evaluation.coefficient,
      fallback: true,
    });

    return result;
  }
}

function qualityStatusLabel(status: QaQualityStatus) {
  if (status === "accepted") return "Pieņemts";
  if (status === "accepted_with_defects") return "Pieņemts ar defektiem";
  if (status === "rejected") return "Nav pieņemts";
  return "Nav skaidrs";
}

function getQaWorkOptions(payload: QaPendingPayload) {
  return payload.drawingMetadata.elements[0]?.works
    ?.map((work) => String(work.name ?? "").trim())
    .filter(Boolean) ?? [];
}

function formatQaWorkOptions(payload: QaPendingPayload) {
  const works = getQaWorkOptions(payload);
  return works.length
    ? works.map((work, index) => `${index + 1}. ${work}`).join("\n")
    : "Nav nolasītu darbu.";
}

function normalizeQaText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function findCheckedWork(payload: QaPendingPayload, text: string) {
  const works = getQaWorkOptions(payload);
  const trimmed = text.trim();
  const numericSelection = trimmed.match(/^\s*(\d{1,2})\s*\.?\s*$/)?.[1];
  if (numericSelection) {
    const selectedIndex = Number(numericSelection) - 1;
    if (selectedIndex >= 0 && selectedIndex < works.length) return works[selectedIndex];
  }

  const selectedTaskKey = getZtcTaskIdentityKey(trimmed);
  const selectedByIdentity = works.find(
    (work) => getZtcTaskIdentityKey(work) === selectedTaskKey,
  );
  if (selectedByIdentity) return selectedByIdentity;

  const codeMatch = trimmed.match(/\b((?:[LR]\s*\d\s*\/\s*[BT]\s*\d)|TL|L\s*0)\b/i)?.[1];
  if (codeMatch) {
    const selectedByCode = works.find(
      (work) => getZtcTaskIdentityKey(work) === getZtcTaskIdentityKey(codeMatch),
    );
    if (selectedByCode) return selectedByCode;
  }

  const normalizedText = normalizeQaText(trimmed);
  if (/\b(karkas\w*|timber\s*frame|koka\s*karkas\w*)\b/i.test(trimmed)) {
    const tl = works.find((work) => /^TL(\b|\s*[-/])/i.test(work));
    if (tl) return tl;
  }

  return works.find((work) => {
    const parts = normalizeQaText(work)
      .split(/[^a-z0-9]+/i)
      .filter((part) => part.length >= 4);
    return parts.some((part) => normalizedText.includes(part));
  }) ?? null;
}

async function promptForCheckedWork(to: string | null, payload: QaPendingPayload) {
  await sendZtcMessage(
    to,
    `Lūdzu, izvēlieties darbu, kuram veicat kvalitātes kontroli. Atsūtiet numuru vai darba kodu:\n${formatQaWorkOptions(payload)}`,
  );
}

async function propagateQualityCoefficient(args: {
  projectName: string | null | undefined;
  elementName: string | null | undefined;
  checkedWork: string | null | undefined;
  qaRecordId: string;
  evaluation: QaQualityEvaluation;
  worker: ZtcWorker;
}) {
  const projectName = String(args.projectName ?? "").trim();
  const elementName = String(args.elementName ?? "").trim();
  const checkedWork = String(args.checkedWork ?? "").trim();
  if (!projectName || !elementName || !checkedWork || args.evaluation.status === "unknown") {
    return { count: 0, coefficient: null as string | null };
  }

  const coefficient =
    args.evaluation.status === "accepted"
      ? "1"
      : args.evaluation.status === "accepted_with_defects"
        ? "0.9"
        : args.evaluation.status === "rejected"
          ? "0"
          : null;

  const context = getZtcFlowContext(args.worker);
  const candidates = await prisma.ztcRecords.findMany({
    where: {
      siteId: context.siteId,
      organizationId: context.organizationId,
      Location: projectName,
      Location_Custom_1: elementName,
      Works: { not: null },
      NOT: [
        { id: args.qaRecordId },
        { Works: QA_WORK_LABEL },
        { Comments_Custom_2: { contains: "\"type\":\"ztc_quality_check\"" } },
      ],
    },
    select: {
      id: true,
      Works: true,
    },
  });
  const checkedWorkKey = getZtcTaskIdentityKey(checkedWork);
  const matchingIds = candidates
    .filter((row) => getZtcTaskIdentityKey(row.Works) === checkedWorkKey)
    .map((row) => row.id);
  if (matchingIds.length === 0) return { count: 0, coefficient };

  const result = await prisma.ztcRecords.updateMany({
    where: { id: { in: matchingIds } },
    data: { Works_Custom_2: coefficient },
  });

  return { count: result.count, coefficient };
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

function getPendingQaSession(worker: ZtcWorker) {
  const context = getZtcFlowContext(worker);
  return prisma.ztcRecords.findFirst({
    where: {
      workerId: worker.id,
      organizationId: context.organizationId,
      Date_Custom_2: null,
      Comments_Custom_1: { startsWith: QA_PENDING_PREFIX },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getRecentCompletedQaSession(worker: ZtcWorker) {
  const context = getZtcFlowContext(worker);
  const cutoff = new Date(Date.now() - QA_COMPLETED_PHOTO_BATCH_WINDOW_MS);
  const session = await prisma.ztcRecords.findFirst({
    where: {
      workerId: worker.id,
      organizationId: context.organizationId,
      Date_Custom_2: { gte: cutoff },
      Works: QA_WORK_LABEL,
      Comments_Custom_1: { startsWith: QA_COMPLETED_PHOTO_BATCH_PREFIX },
    },
    orderBy: { Date_Custom_2: "desc" },
  });

  return isRecentCompletedPhotoBatch(session?.Comments_Custom_1) ? session : null;
}

function buildQualityMetadata(args: {
  payload: QaPendingPayload;
  qualityPhotoUrls: string[];
  qualityText: string;
  checkedWork: string | null;
  qualityEvaluation: QaQualityEvaluation;
  coefficientPropagation?: { count: number; coefficient: string | null };
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
    qualityEvaluation: args.qualityEvaluation,
    coefficientPropagation: args.coefficientPropagation ?? null,
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
      siteId: getZtcFlowContext(args.worker).siteId,
      organizationId: getZtcFlowContext(args.worker).organizationId,
    })),
  });
}

async function completeQualitySession(args: {
  session: Awaited<ReturnType<typeof getPendingQaSession>>;
  worker: ZtcWorker;
  to: string | null;
  payload: QaPendingPayload;
}) {
  const startedAt = Date.now();
  if (!args.session) return;

  const qualityText = args.payload.qualityText?.trim() ?? "";
  const qualityPhotoUrls = args.payload.qualityPhotoUrls ?? [];
  if (!qualityText || qualityPhotoUrls.length === 0) return;
  if (!args.payload.checkedWork) {
    await promptForCheckedWork(args.to, args.payload);
    return;
  }

  const { polishedText: polishedQualityText, evaluation: qualityEvaluation } =
    await analyzeQualityMessage(qualityText);
  const checkedWork = args.payload.checkedWork;
  const elementName = args.payload.drawingMetadata.elements[0]?.elementName ?? "";
  const comments = [
    `Kvalitātes kontrole: ${polishedQualityText}`,
    `Vērtējums: ${qualityStatusLabel(qualityEvaluation.status)}`,
    qualityEvaluation.coefficient ? `Koeficients: ${qualityEvaluation.coefficient}` : null,
    checkedWork ? `Darbs: ${checkedWork}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const initialMetadata = buildQualityMetadata({
    payload: args.payload,
    qualityPhotoUrls,
    qualityText: polishedQualityText,
    checkedWork,
    qualityEvaluation,
  });

  const dbUpdateStartedAt = Date.now();
  const updated = await prisma.ztcRecords.update({
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
      Comments_Custom_2: JSON.stringify(initialMetadata),
      Photos: [args.payload.drawingPhotoUrl, ...qualityPhotoUrls],
      originalUserComment: `${workerFullName(args.worker)} : ${qualityText}`,
      originalAudioUrl: mergeOriginalAudioUrls(args.payload.originalAudioUrl),
    },
  });
  logZtcTiming("qa_session_complete_db_update", dbUpdateStartedAt, {
    workerId: args.worker.id,
    sessionId: args.session.id,
    status: qualityEvaluation.status,
    qualityPhotoCount: qualityPhotoUrls.length,
  });

  await sendZtcMessage(
    args.to,
    `Kvalitātes kontrole saglabāta.\nProjekts: ${updated.Location}\nElements: ${updated.Location_Custom_1}${checkedWork ? `\nDarbs: ${checkedWork}` : ""}\nVērtējums: ${qualityStatusLabel(qualityEvaluation.status)}${
      qualityEvaluation.status === "unknown"
        ? "\nKoeficients netika mainīts."
        : `\nKoeficients: ${qualityEvaluation.coefficient ?? "tukšs"}\nSaistītie ieraksti tiek atjaunināti.`
    }`,
  );

  const propagationStartedAt = Date.now();
  const coefficientPropagation = await propagateQualityCoefficient({
    projectName: updated.Location,
    elementName: updated.Location_Custom_1,
    checkedWork,
    qaRecordId: updated.id,
    evaluation: qualityEvaluation,
    worker: args.worker,
  });
  logZtcTiming("qa_coefficient_propagation", propagationStartedAt, {
    workerId: args.worker.id,
    sessionId: updated.id,
    status: qualityEvaluation.status,
    coefficient: coefficientPropagation.coefficient,
    affectedRecordCount: coefficientPropagation.count,
    checkedWork,
  });

  const metadata = buildQualityMetadata({
    payload: args.payload,
    qualityPhotoUrls,
    qualityText: polishedQualityText,
    checkedWork,
    qualityEvaluation,
    coefficientPropagation,
  });

  const metadataStartedAt = Date.now();
  await prisma.ztcRecords.update({
    where: { id: updated.id },
    data: {
      Comments_Custom_2: JSON.stringify(metadata),
    },
  });
  logZtcTiming("qa_metadata_db_update", metadataStartedAt, {
    workerId: args.worker.id,
    sessionId: updated.id,
  });

  const photosStartedAt = Date.now();
  await saveQualityPhotos({
    worker: args.worker,
    payload: args.payload,
    urls: qualityPhotoUrls,
  });
  logZtcTiming("qa_save_quality_photos", photosStartedAt, {
    workerId: args.worker.id,
    sessionId: updated.id,
    qualityPhotoCount: qualityPhotoUrls.length,
  });

  console.log("[ZTC QA]", {
    event: "quality_check_saved",
    sitediaryrecordId: updated.id,
    workerId: args.worker.id,
    project: updated.Location,
    element: updated.Location_Custom_1,
    checkedWork,
    qualityStatus: qualityEvaluation.status,
    coefficient: coefficientPropagation.coefficient,
    affectedRecordCount: coefficientPropagation.count,
    qualityPhotoCount: qualityPhotoUrls.length,
  });

  logZtcTiming("complete_quality_session_total", startedAt, {
    workerId: args.worker.id,
    sessionId: updated.id,
    status: qualityEvaluation.status,
    qualityPhotoCount: qualityPhotoUrls.length,
    affectedRecordCount: coefficientPropagation.count,
  });
}

async function appendPhotosToRecentCompletedQaSession(args: {
  formData: FormData;
  idxs: number[];
  worker: ZtcWorker;
  caption?: string | null;
}) {
  const session = await getRecentCompletedQaSession(args.worker);
  if (!session) return false;

  const appendDecision = shouldAppendToRecentCompletedQaSession({
    session,
    formData: args.formData,
    caption: args.caption,
  });
  if (!appendDecision.shouldAppend) {
    console.log("[ZTC QA]", {
      event: "quality_recent_completed_photo_append_skipped_for_new_drawing_check",
      sitediaryrecordId: session.id,
      workerId: args.worker.id,
      requestedPhotoCount: args.idxs.length,
      reason: appendDecision.reason,
      messageTimestamp: getString(args.formData, "MessageTimestamp"),
      caption: args.caption ?? "",
    });
    return false;
  }

  const metadata = parseJsonObject<{
    type?: string;
    drawingPhotoUrl?: string;
    qualityPhotoUrls?: string[];
  }>(session.Comments_Custom_2, {});
  if (metadata.type !== "ztc_quality_check") {
    console.warn("[ZTC QA]", {
      event: "quality_recent_completed_append_suppressed_missing_metadata",
      sitediaryrecordId: session.id,
      workerId: args.worker.id,
      requestedPhotoCount: args.idxs.length,
      reason: appendDecision.reason,
    });
    return true;
  }

  const images = await uploadQualityImages(args.formData, args.idxs, "recent_completed_append");
  const uploadedUrls = images.map((image) => image.publicUrl);
  if (uploadedUrls.length === 0) {
    console.warn("[ZTC QA]", {
      event: "quality_late_photos_append_skipped",
      sitediaryrecordId: session.id,
      workerId: args.worker.id,
      requestedPhotoCount: args.idxs.length,
      reason: appendDecision.reason,
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

  await prisma.ztcRecords.update({
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
    reason: appendDecision.reason,
    messageTimestamp: getString(args.formData, "MessageTimestamp"),
  });

  return true;
}

async function handleQualityDrawingPhoto(args: {
  formData: FormData;
  idx: number;
  to: string | null;
  worker: ZtcWorker;
  drawingProfile?: ProductionDrawingExtractionProfile;
}) {
  const existing = await getPendingQaSession(args.worker);
  if (existing) {
    await sendZtcMessage(args.to, "Jums jau ir iesākta kvalitātes kontrole. Lūdzu, pabeidziet to ar kvalitātes foto un aprakstu.");
    return;
  }

  await sendZtcMessage(args.to, "Rasējuma foto saņemts kvalitātes kontrolei, lūdzu uzgaidiet...");
  const { image, extraction } = await uploadAndExtractDrawingInfo(args.formData, args.idx, {
    drawingProfile: args.drawingProfile,
  });

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

  const canonicalExtraction = {
    ...extraction,
    projectName: normalizeZtcProjectName(extraction.projectName) || extraction.projectName,
  };
  const drawingMetadata = buildDrawingMetadata(canonicalExtraction);
  const payload: QaPendingPayload = {
    drawingPhotoUrl: image.publicUrl,
    drawingMetadata,
    qualityPhotoUrls: [],
  };

  const created = await prisma.ztcRecords.create({
    data: {
      workerId: args.worker.id,
      siteId: getZtcFlowContext(args.worker).siteId,
      organizationId: getZtcFlowContext(args.worker).organizationId,
      Date: new Date(),
      Date_Custom_1: new Date(),
      Location: canonicalExtraction.projectName,
      Location_Custom_1: canonicalExtraction.elementName,
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
    project: canonicalExtraction.projectName,
    element: canonicalExtraction.elementName,
  });

  await sendZtcMessage(
    args.to,
    `Rasējums pieņemts kvalitātes kontrolei.\nProjekts: ${canonicalExtraction.projectName}\nElements: ${canonicalExtraction.elementName}\nDarbi:\n${formatExtractedWorksForMessage(canonicalExtraction)}\n\nVispirms izvēlieties pārbaudāmo darbu: atsūtiet darba numuru no saraksta vai darba kodu, piemēram L2/B2.`,
  );
}

async function handleQualityPhotos(args: {
  formData: FormData;
  idxs: number[];
  to: string | null;
  worker: ZtcWorker;
  caption: string;
}) {
  const session = await getPendingQaSession(args.worker);
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
  const caption = args.caption.trim();
  const captionCheckedWork =
    !payload.checkedWork && caption ? findCheckedWork(payload, caption) : null;
  const nextPayload: QaPendingPayload = {
    ...payload,
    checkedWork: payload.checkedWork ?? captionCheckedWork,
    qualityText: caption && !captionCheckedWork ? caption : payload.qualityText || null,
    qualityPhotoUrls,
    qualityPhotoPromptAt: shouldPrompt ? now : payload.qualityPhotoPromptAt ?? null,
  };

  await prisma.ztcRecords.update({
    where: { id: session.id },
    data: {
      Comments_Custom_1: makePendingState(nextPayload),
      Photos: [payload.drawingPhotoUrl, ...qualityPhotoUrls],
    },
  });

  if (!nextPayload.checkedWork) {
    await promptForCheckedWork(args.to, nextPayload);
    return;
  }

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
  const startedAt = Date.now();
  let outcome = "started";
  try {
  const session = await getPendingQaSession(args.worker);
  const payload = readPendingPayload(session?.Comments_Custom_1);

  if (!session || !payload) {
    outcome = "missing_pending_session";
    await sendZtcMessage(args.to, "Lūdzu, sāciet kvalitātes kontroli ar ražošanas rasējuma foto.");
    return;
  }

  if (!payload.checkedWork) {
    const checkedWork = findCheckedWork(payload, args.text);
    if (!checkedWork) {
      outcome = "waiting_for_checked_work";
      await promptForCheckedWork(args.to, payload);
      return;
    }

    const nextPayload: QaPendingPayload = {
      ...payload,
      checkedWork,
    };
    await prisma.ztcRecords.update({
      where: { id: session.id },
      data: {
        Comments_Custom_1: makePendingState(nextPayload),
      },
    });

    if ((nextPayload.qualityPhotoUrls ?? []).length > 0 && nextPayload.qualityText) {
      await completeQualitySession({
        session,
        worker: args.worker,
        to: args.to,
        payload: nextPayload,
      });
      outcome = "completed_quality_session_after_work_selection";
      return;
    }

    outcome = "checked_work_selected";
    await sendZtcMessage(
      args.to,
      `Darbs izvēlēts: ${checkedWork}.\nTagad atsūtiet kvalitātes foto un balss ziņu vai tekstu ar kvalitātes aprakstu.`,
    );
    return;
  }

  if (!isUsefulQaText(args.text)) {
    outcome = "not_useful_text";
    await sendZtcMessage(args.to, "Neizdevās saprast kvalitātes aprakstu. Lūdzu, mēģiniet vēlreiz ar balss ziņu vai tekstu.");
    return;
  }

  const nextPayload: QaPendingPayload = {
    ...payload,
    qualityText: args.text.trim(),
    originalAudioUrl: mergeOriginalAudioUrls(payload.originalAudioUrl, args.originalAudioUrl) ?? null,
  };

  const dbUpdateStartedAt = Date.now();
  await prisma.ztcRecords.update({
    where: { id: session.id },
    data: {
      Comments_Custom_1: makePendingState(nextPayload),
    },
  });
  logZtcTiming("qa_text_pending_db_update", dbUpdateStartedAt, {
    workerId: args.worker.id,
    sessionId: session.id,
    textLength: args.text.trim().length,
  });

  if ((nextPayload.qualityPhotoUrls ?? []).length > 0) {
    await completeQualitySession({
      session,
      worker: args.worker,
      to: args.to,
      payload: nextPayload,
    });
    outcome = "completed_quality_session";
    return;
  }

  outcome = "waiting_for_quality_photos";
  await sendZtcMessage(args.to, "Kvalitātes apraksts saņemts. Lūdzu, atsūtiet kvalitātes kontroles foto.");
  } finally {
    logZtcTiming("handle_quality_text_total", startedAt, {
      workerId: args.worker.id,
      textLength: args.text.trim().length,
      outcome,
    });
  }
}

export async function handleZtcQualityRoute(args: {
  formData: FormData;
  worker: ZtcWorker;
  drawingProfile?: ProductionDrawingExtractionProfile;
}) {
  const startedAt = Date.now();
  const { formData, worker } = args;
  const from = getString(formData, "From");
  const body = (getString(formData, "Body") || "").trim();
  const numMedia = Number(getString(formData, "NumMedia") || "0") || 0;
  const imageIndexes = findMediaIndexes(formData, numMedia, "image/");
  const imageIdx = imageIndexes[0] ?? -1;
  const audioIdx = findFirstMediaIndex(formData, numMedia, "audio/");
  let outcome = "started";

  try {
    if (imageIndexes.length > 0) {
      const pending = await getPendingQaSession(worker);
      if (pending) {
        outcome = "quality_photos";
        await handleQualityPhotos({ formData, idxs: imageIndexes, to: from, worker, caption: body });
      } else if (await appendPhotosToRecentCompletedQaSession({ formData, idxs: imageIndexes, worker, caption: body })) {
        // QA album spillover, or a caption explicitly saying this is an extra QA photo.
        outcome = "appended_recent_completed_qa_photos";
      } else {
        outcome = "quality_drawing_photo";
        await handleQualityDrawingPhoto({
          formData,
          idx: imageIdx,
          to: from,
          worker,
          drawingProfile: args.drawingProfile,
        });
      }
      return;
    }

    if (audioIdx >= 0) {
      await sendZtcMessage(from, "Balss ziņa saņemta, lūdzu uzgaidiet...");
      const transcript = await transcribeAudioWithSource(formData, audioIdx);
      await handleQualityText({
        text: transcript.text,
        to: from,
        worker,
        originalAudioUrl: transcript.originalAudioUrl,
      });
      outcome = "audio_quality_text";
      return;
    }

    if (body) {
      await handleQualityText({ text: body, to: from, worker });
      outcome = "body_quality_text";
      return;
    }

    outcome = "empty_message";
    await sendZtcMessage(from, "Lūdzu, sāciet kvalitātes kontroli ar ražošanas rasējuma foto.");
  } catch (error) {
    outcome = "error";
    console.error("[ZTC QA] failed", error);
    await sendZtcMessage(
      from,
      isZtcTimeoutError(error) || imageIdx >= 0
        ? "Tīkla vai foto apstrādes kļūda. Lūdzu, atsūtiet foto vēlreiz."
        : "Atvainojiet, kvalitātes kontroles plūsma nevarēja apstrādāt šo ziņu. Lūdzu, mēģiniet vēlreiz.",
    );
  } finally {
    logZtcTiming("handle_ztc_quality_route_total", startedAt, {
      workerId: worker.id,
      outcome,
      numMedia,
      imageCount: imageIndexes.length,
      hasAudio: audioIdx >= 0,
      hasBody: Boolean(body),
    });
  }
}
