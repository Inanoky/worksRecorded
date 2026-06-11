import { UTApi } from "uploadthing/server";
import OpenAI, { toFile } from "openai";
import { prisma } from "@/lib/utils/db";
import {
  fetchWhatsAppMediaAsBuffer,
  getString,
} from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage, sendTypingIndicator } from "@/lib/utils/whatsapp-helpers/shared/sender";
import ztcSiteDiaryRecordsMap from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";
import { getConfig } from "@/server/actions/site-diary-actions";
import { getUploadThingFileUrl } from "@/lib/utils/uploadthing-file-url";

export const ZTC_ORGANIZATION_ID = "21511437-f6ab-402b-aa2d-613110eb61da";
export const ZTC_SITE_ID = "4c26c435-dd19-49d7-ad60-981eb1eeaeff";
const FINISH_PENDING_PREFIX = "__ZTC_FINISH_PENDING__";
const PHOTO_PENDING_FINISH_PREFIX = "__ZTC_PHOTO_PENDING_FINISH__";
const DIAGONAL_FIRST_PHOTO_PENDING_PREFIX = "__ZTC_DIAGONAL_FIRST_PHOTO_PENDING__";
const DIAGONAL_FIRST_MEASURE_PENDING_PREFIX = "__ZTC_DIAGONAL_FIRST_MEASURE_PENDING__";
const DIAGONAL_SECOND_PHOTO_PENDING_PREFIX = "__ZTC_DIAGONAL_SECOND_PHOTO_PENDING__";
const DIAGONAL_SECOND_MEASURE_PENDING_PREFIX = "__ZTC_DIAGONAL_SECOND_MEASURE_PENDING__";
const DIAGONALS_PENDING_PREFIX = "__ZTC_DIAGONALS_PENDING__";
const DIAGONALS_CONFIRM_PREFIX = "__ZTC_DIAGONALS_CONFIRM__";
const PHOTO_BATCH_CONFIRM_PREFIX = "__ZTC_PHOTO_BATCH_CONFIRM__";
const PHOTO_BATCH_CONFIRM_WINDOW_MS = 45_000;
const ZTC_MEDIA_TIMEOUT_MS = 30_000;
const ZTC_UPLOAD_TIMEOUT_MS = 30_000;
const ZTC_VISION_TIMEOUT_MS = 120_000;
const ZTC_TEXT_TIMEOUT_MS = 30_000;
const ZTC_TRANSCRIPTION_TIMEOUT_MS = 30_000;
const ZTC_DROPDOWN_CACHE_MS = 60_000;
const ZTC_COMMENT_POLISH_TIMEOUT_MS = 15_000;

class ZtcTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = "ZtcTimeoutError";
  }
}

export type ZtcWorker = {
  id: string;
  name: string | null;
  surname: string | null;
  role?: string | null;
  phone: string | null;
  siteId: string | null;
  organizationId: string | null;
};

export type DrawingExtraction = {
  isConstructionDrawing: boolean;
  hasReadableProjectName: boolean;
  hasReadableElementName: boolean;
  hasReadableWorkList: boolean;
  qualityOk: boolean;
  projectName: string | null;
  elementName: string | null;
  totalAreaM2: number | null;
  workList: string[];
  workItems: Array<{
    name: string;
    amountM2: number | null;
  }>;
  issue: string | null;
};

type WorkExtraction = {
  isGibberish: boolean;
  isFinish: boolean;
  isAdditionalWork: boolean;
  additionalWorkDescription: string | null;
  workOption: string | null;
  amountCompleted: number | null;
  units: string | null;
  issue: string | null;
};

type ZtcConfigField = {
  DropDownOptions?: Record<string, unknown>;
};

type ZtcConfigMap = Record<string, ZtcConfigField | undefined>;
type ZtcDropdownOptions = {
  workOptions: string[];
  unitOptions: string[];
};

let ztcDropdownOptionsCache:
  | { value: ZtcDropdownOptions; expiresAt: number }
  | null = null;

type OpenZtcSession = NonNullable<Awaited<ReturnType<typeof getOpenZtcSession>>>;

type ZtcDrawingMetadata = {
  type: "ztc_drawing_context";
  version: 1;
  projectName: string;
  elements: Array<{
    elementName: string;
    totalAreaM2: number | null;
    works: Array<{
      name: string;
      amountM2: number | null;
    }>;
  }>;
};

type ZtcDiagonalPayload = {
  completedText: string;
  firstPhotoUrl?: string;
  firstMeasureMm?: number;
  secondPhotoUrl?: string;
  secondMeasureMm?: number;
};

const utapi = new UTApi();

function getDropdownLabels(config: ZtcConfigMap, fieldKey: string) {
  const options = config?.[fieldKey]?.DropDownOptions;
  if (!options || typeof options !== "object") return [];
  return Object.values(options)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function normalizeZtcWorkName(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";

  return trimmed
    .replace(/^T\s*\d+(?=\s|[-/]|$)/i, "TL")
    .replace(/^T(?!L)(?=\s|[-/]|$)/i, "TL");
}

function normalizeZtcWorkOptions(values: string[]) {
  const seen = new Set<string>();
  const options: string[] = [];

  for (const value of values) {
    const normalized = normalizeZtcWorkName(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(normalized);
  }

  return options;
}

async function getZtcDropdownOptions() {
  const now = Date.now();
  if (ztcDropdownOptionsCache && ztcDropdownOptionsCache.expiresAt > now) {
    return ztcDropdownOptionsCache.value;
  }

  const config = ((await getConfig(ZTC_SITE_ID)) ??
    ztcSiteDiaryRecordsMap) as ZtcConfigMap;

  const value = {
    workOptions: normalizeZtcWorkOptions(getDropdownLabels(config, "Works")),
    unitOptions: getDropdownLabels(config, "Units"),
  };

  ztcDropdownOptionsCache = {
    value,
    expiresAt: now + ZTC_DROPDOWN_CACHE_MS,
  };

  return value;
}

function normalizeAllowedOption(value: string | null | undefined, allowed: string[]) {
  const normalized = value?.trim();
  if (!normalized) return null;

  return (
    allowed.find((option) => option.toLowerCase() === normalized.toLowerCase()) ??
    null
  );
}

function normalizeAllowedWorkOption(value: string | null | undefined, allowed: string[]) {
  const normalized = normalizeZtcWorkName(value);
  if (!normalized) return null;

  return (
    allowed.find(
      (option) =>
        normalizeZtcWorkName(option).toLowerCase() === normalized.toLowerCase(),
    ) ?? null
  );
}

function getFallbackOtherWorkOption(allowed: string[]) {
  return (
    allowed.find((option) => option.toLowerCase() === "cits") ??
    allowed.find((option) => option.toLowerCase().includes("cits")) ??
    "Cits"
  );
}

function hasPapilddarbiKeyword(text: string) {
  return /\bpapild\w*/i.test(text);
}

function hasFrameKeyword(text: string) {
  return /\b(karkas\w*|timber\s*frame|timberkarkas\w*|koka\s*karkas\w*)\b/i.test(text);
}

function isTlWork(workName: string | null | undefined) {
  return /^TL(\b|\s*[-/])/i.test(normalizeZtcWorkName(workName));
}

export function workerFullName(worker: ZtcWorker) {
  return [worker.name, worker.surname].filter(Boolean).join(" ").trim() || "Darbinieks";
}

function formatSessionWork(session: Pick<OpenZtcSession, "Location" | "Location_Custom_1" | "Works">) {
  return [
    session.Works,
    session.Location_Custom_1 ? `elements ${session.Location_Custom_1}` : null,
    session.Location ? `projekts ${session.Location}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function hasCompletedWorkPhoto(session: Pick<OpenZtcSession, "Location" | "Photos">) {
  const photoCount = session.Photos?.length ?? 0;
  return session.Location === "Papilddarbi" ? photoCount >= 1 : photoCount >= 2;
}

function logZtcSession(
  event: string,
  args: {
    session?: Partial<OpenZtcSession> | null;
    worker?: ZtcWorker | null;
    details?: Record<string, unknown>;
  } = {},
) {
  const session = args.session;
  console.log("[ZTC session]", {
    event,
    sitediaryrecordId: session?.id ?? null,
    workerId: args.worker?.id ?? session?.workerId ?? null,
    workerName: args.worker ? workerFullName(args.worker) : null,
    project: session?.Location ?? null,
    element: session?.Location_Custom_1 ?? null,
    work: session?.Works ?? null,
    details: args.details ?? {},
  });
}

function withZtcTimeout<T>(promise: Promise<T>, label: string, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new ZtcTimeoutError(label, timeoutMs)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

export function isZtcTimeoutError(error: unknown) {
  return error instanceof ZtcTimeoutError || (error instanceof Error && error.name === "ZtcTimeoutError");
}

function readPhotoBatchConfirmAt(value: string | null | undefined) {
  const raw = readMarkerPayload(value, PHOTO_BATCH_CONFIRM_PREFIX);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRecentPhotoBatchConfirmation(value: string | null | undefined, now = Date.now()) {
  const confirmedAt = readPhotoBatchConfirmAt(value);
  return confirmedAt != null && now - confirmedAt < PHOTO_BATCH_CONFIRM_WINDOW_MS;
}

function photoBatchMarker(now = Date.now()) {
  return `${PHOTO_BATCH_CONFIRM_PREFIX} ${now}`;
}

export async function sendZtcMessage(to: string | null, message: string) {
  try {
    await sendTypingIndicator(to);
  } catch (error) {
    console.warn("[ZTC workflow] typing indicator failed", error);
  }
  await sendMessage(to, message);
}

function stripWorkerPrefix(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return "";
  const separatorIndex = normalized.indexOf(" : ");
  return separatorIndex >= 0
    ? normalized.slice(separatorIndex + 3).trim()
    : normalized;
}

function normalizeCommentLabel(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function stripCommentLabel(value: string, label: string) {
  return normalizeCommentLabel(value).startsWith(normalizeCommentLabel(label))
    ? value.slice(label.length).trim()
    : value;
}

function getCommentLineText(value: string, labels: string[]) {
  for (const label of labels) {
    if (normalizeCommentLabel(value).startsWith(normalizeCommentLabel(label))) {
      return value.slice(label.length).trim();
    }
  }
  return null;
}

export async function polishZtcCommentText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text || text.length < 3) return text;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await withZtcTimeout(
      openai.chat.completions.create({
        model: process.env.ZTC_TEXT_MODEL || "gpt-5.4-mini",
        messages: [
          {
            role: "system",
            content:
              "Correct this factory worker comment in Latvian. Preserve the original meaning, technical terms, project names, element names, work codes, numbers, units, and names. Do not add details. Return only the corrected comment text without quotes.",
          },
          { role: "user", content: text },
        ],
      }),
      "ztc_comment_polish",
      ZTC_COMMENT_POLISH_TIMEOUT_MS,
    );

    return response.choices[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.warn("[ZTC workflow] comment polish failed", error);
    return text;
  }
}

async function buildPolishedZtcUserComments(args: {
  startText?: string | null;
  finishText?: string | null;
  diagonalOneMm?: number | null;
  diagonalTwoMm?: number | null;
}) {
  const [startText, finishText] = await Promise.all([
    polishZtcCommentText(stripCommentLabel(args.startText?.trim() ?? "", "Sākums:")),
    polishZtcCommentText(stripCommentLabel(args.finishText?.trim() ?? "", "Beigas:")),
  ]);

  return buildZtcUserComments({
    ...args,
    startText,
    finishText,
  });
}

async function polishZtcCommentBlock(value: string) {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const polishedLines: string[] = [];

  for (const line of lines) {
    const startText = getCommentLineText(line, ["Sākums:", "Sakums:"]);
    if (startText !== null) {
      polishedLines.push(`Sākums: ${await polishZtcCommentText(startText)}`);
      continue;
    }

    const finishText = getCommentLineText(line, ["Beigas:"]);
    if (finishText !== null) {
      polishedLines.push(`Beigas: ${await polishZtcCommentText(finishText)}`);
      continue;
    }

    polishedLines.push(
      line
        .replace(/^Diagonale\s+1:/i, "Diagonāle 1:")
        .replace(/^Diagonale\s+2:/i, "Diagonāle 2:"),
    );
  }

  return polishedLines.join("\n");
}

function getSessionStartMessage(session: OpenZtcSession) {
  const comments = session.Comments?.trim();
  const startLine = comments
    ?.split("\n")
    .map((line) => line.trim())
    .find((line) => getCommentLineText(line, ["Sākums:", "Sakums:"]) !== null);

  if (startLine) return getCommentLineText(startLine, ["Sākums:", "Sakums:"]) ?? "";

  const originalMessage = stripWorkerPrefix(session.originalUserComment);
  if (originalMessage) return originalMessage;

  if (!comments || comments.includes("Darbinieks:") || comments.includes("Projekts:")) {
    return "";
  }

  return stripCommentLabel(comments, "Sākums:");
}

function buildZtcUserComments(args: {
  startText?: string | null;
  finishText?: string | null;
  diagonalOneMm?: number | null;
  diagonalTwoMm?: number | null;
}) {
  const startText = stripCommentLabel(args.startText?.trim() ?? "", "Sākums:");
  const finishText = stripCommentLabel(args.finishText?.trim() ?? "", "Beigas:");

  return [
    startText ? `Sākums: ${startText}` : null,
    finishText ? `Beigas: ${finishText}` : null,
    args.diagonalOneMm != null ? `Diagonāle 1: ${args.diagonalOneMm} mm` : null,
    args.diagonalTwoMm != null ? `Diagonāle 2: ${args.diagonalTwoMm} mm` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function findFirstMediaIndex(formData: FormData, numMedia: number, prefix: string) {
  for (let i = 0; i < numMedia; i += 1) {
    const contentType = (getString(formData, `MediaContentType${i}`) || "").toLowerCase();
    if (contentType.startsWith(prefix)) return i;
  }

  return -1;
}

export function findMediaIndexes(formData: FormData, numMedia: number, prefix: string) {
  const indexes: number[] = [];
  for (let i = 0; i < numMedia; i += 1) {
    const contentType = (getString(formData, `MediaContentType${i}`) || "").toLowerCase();
    if (contentType.startsWith(prefix)) indexes.push(i);
  }
  return indexes;
}

function inferAudioExtension(contentType: string) {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("m4a") || normalized.includes("mp4")) return "m4a";
  return "ogg";
}

export function parseJsonObject<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function readMarkerPayload(value: string | null | undefined, prefix: string) {
  if (!value?.startsWith(prefix)) return "";
  return value.slice(prefix.length).trim();
}

function parseDiagonalNumbers(text: string): [number, number] | null {
  const matches = text.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
  const numbers = matches
    .map((match) => Number(match.replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (numbers.length < 2) return null;
  return [numbers[0], numbers[1]];
}

function isPositiveConfirmation(text: string) {
  return /\b(ja|jā|yes|ok|pareizi|apstiprinu|apstiprinats|apstiprināts|labi|correct)\b/i.test(text);
}

function isNegativeConfirmation(text: string) {
  return /\b(ne|nē|no|nepareizi|labot|kluda|kļuda|kļūda|redo|again)\b/i.test(text);
}

function buildDiagonalComment(args: {
  session: OpenZtcSession;
  completedText: string;
  diagonalA: number;
  diagonalB: number;
}) {
  return buildZtcUserComments({
    startText: getSessionStartMessage(args.session),
    finishText: args.completedText,
    diagonalOneMm: args.diagonalA,
    diagonalTwoMm: args.diagonalB,
  });
}

function parseDiagonalMeasureMm(text: string): number | null {
  const matches = text.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
  const numbers = matches
    .map((match) => Number(match.replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);

  return numbers[0] ?? null;
}

function isDiagonalPhotoMeasureFlow(value: string | null | undefined) {
  return Boolean(
    value?.startsWith(DIAGONAL_FIRST_PHOTO_PENDING_PREFIX) ||
      value?.startsWith(DIAGONAL_FIRST_MEASURE_PENDING_PREFIX) ||
      value?.startsWith(DIAGONAL_SECOND_PHOTO_PENDING_PREFIX) ||
      value?.startsWith(DIAGONAL_SECOND_MEASURE_PENDING_PREFIX),
  );
}

function readDiagonalPhotoMeasurePayload(
  value: string | null | undefined,
  prefix: string,
): ZtcDiagonalPayload {
  return parseJsonObject<ZtcDiagonalPayload>(readMarkerPayload(value, prefix), {
    completedText: "",
  });
}

function buildDiagonalPhotoMeasureComment(args: {
  session: OpenZtcSession;
  payload: ZtcDiagonalPayload;
}) {
  return buildZtcUserComments({
    startText: getSessionStartMessage(args.session),
    finishText: args.payload.completedText,
    diagonalOneMm: args.payload.firstMeasureMm,
    diagonalTwoMm: args.payload.secondMeasureMm,
  });
}

function normalizeDrawingExtraction(value: DrawingExtraction): DrawingExtraction {
  const workItems = Array.isArray(value.workItems)
    ? value.workItems
        .map((item) => ({
          name: normalizeZtcWorkName(item?.name),
          amountM2:
            item?.amountM2 == null || !Number.isFinite(Number(item.amountM2))
              ? null
              : Number(item.amountM2),
        }))
        .filter((item) => item.name)
    : [];
  const workList = Array.isArray(value.workList)
    ? value.workList.map((work) => normalizeZtcWorkName(work)).filter(Boolean)
    : [];

  return {
    ...value,
    totalAreaM2:
      value.totalAreaM2 == null || !Number.isFinite(Number(value.totalAreaM2))
        ? null
        : Number(value.totalAreaM2),
    workList: workList.length ? workList : workItems.map((item) => item.name),
    workItems,
  };
}

function parseZtcDrawingMetadata(value: string | null | undefined): ZtcDrawingMetadata | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as ZtcDrawingMetadata;
    if (parsed?.type !== "ztc_drawing_context" || !Array.isArray(parsed.elements)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildDrawingMetadata(extraction: DrawingExtraction): ZtcDrawingMetadata {
  const worksSource = extraction.workItems.length
    ? extraction.workItems
    : extraction.workList.map((name) => ({
        name: normalizeZtcWorkName(name),
        amountM2: extraction.totalAreaM2,
      }));

  return {
    type: "ztc_drawing_context",
    version: 1,
    projectName: extraction.projectName ?? "",
    elements: [
      {
        elementName: extraction.elementName ?? "",
        totalAreaM2: extraction.totalAreaM2,
        works: worksSource.map((work) => ({
          name: normalizeZtcWorkName(work.name),
          amountM2: work.amountM2 ?? extraction.totalAreaM2,
        })),
      },
    ],
  };
}

function getSessionWorkOptions(session: OpenZtcSession | null) {
  const metadata = parseZtcDrawingMetadata(session?.Comments_Custom_2);
  const element = metadata?.elements.find(
    (item) =>
      item.elementName.toLowerCase() ===
      String(session?.Location_Custom_1 ?? "").trim().toLowerCase(),
  );

  return normalizeZtcWorkOptions(element?.works.map((work) => work.name).filter(Boolean) ?? []);
}

function getSessionWorkAmountM2(session: OpenZtcSession, workName: string | null | undefined) {
  const normalizedWork = normalizeZtcWorkName(workName).toLowerCase();
  if (!normalizedWork) return null;

  const metadata = parseZtcDrawingMetadata(session.Comments_Custom_2);
  const element = metadata?.elements.find(
    (item) =>
      item.elementName.toLowerCase() ===
      String(session.Location_Custom_1 ?? "").trim().toLowerCase(),
  );
  const work = element?.works.find(
    (item) => normalizeZtcWorkName(item.name).toLowerCase() === normalizedWork,
  );

  return work?.amountM2 ?? element?.totalAreaM2 ?? null;
}

export function formatExtractedWorksForMessage(extraction: DrawingExtraction) {
  const items = extraction.workItems.length
    ? extraction.workItems
    : extraction.workList.map((name) => ({ name, amountM2: extraction.totalAreaM2 }));

  return items
    .map((item, index) => {
      const amount = item.amountM2 ?? extraction.totalAreaM2;
      return `${index + 1}. ${normalizeZtcWorkName(item.name)}${amount != null ? ` - ${amount} m2` : ""}`;
    })
    .join("\n");
}

export async function uploadMediaImage(formData: FormData, idx: number) {
  const mediaUrl = getString(formData, `MediaUrl${idx}`);
  const contentType = (getString(formData, `MediaContentType${idx}`) || "image/jpeg").toLowerCase();

  if (!mediaUrl) throw new Error("Image media URL is missing");

  const buffer = await withZtcTimeout(
    fetchWhatsAppMediaAsBuffer(mediaUrl),
    "ztc_image_media_fetch",
    ZTC_MEDIA_TIMEOUT_MS,
  );
  const ext = contentType.split("/")[1] || "jpg";
  const file = new File([buffer], `ztc_whatsapp_${Date.now()}.${ext}`, {
    type: contentType,
  });

  const uploaded = await withZtcTimeout(
    utapi.uploadFiles([file]),
    "ztc_image_upload",
    ZTC_UPLOAD_TIMEOUT_MS,
  );
  const first = Array.isArray(uploaded) ? uploaded[0] : uploaded;

  if (first?.error || !first?.data) {
    throw new Error(first?.error?.message || "Failed to upload image");
  }

  const publicUrl = getUploadThingFileUrl(first.data);

  if (!publicUrl) {
    throw new Error("UploadThing upload completed without a file URL");
  }

  return {
    publicUrl,
    contentType,
  };
}

async function uploadZtcImages(formData: FormData, idxs: number[], context: string) {
  const results = await Promise.allSettled(idxs.map((idx) => uploadMediaImage(formData, idx)));
  const uploaded = results
    .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof uploadMediaImage>>> => result.status === "fulfilled")
    .map((result) => result.value);
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length > 0) {
    console.warn("[ZTC workflow]", {
      event: "image_upload_partial_failure",
      context,
      requestedPhotoCount: idxs.length,
      uploadedPhotoCount: uploaded.length,
      failedPhotoCount: failed.length,
      errors: failed.map((result) =>
        result.reason instanceof Error ? result.reason.message : String(result.reason),
      ),
    });
  }

  return uploaded;
}

async function uploadOriginalAudioBuffer(buffer: Buffer, contentType: string) {
  const file = new File([buffer], `ztc_voice_${Date.now()}.${inferAudioExtension(contentType)}`, {
    type: contentType || "audio/ogg",
  });

  const uploaded = await withZtcTimeout(
    utapi.uploadFiles([file]),
    "ztc_audio_upload",
    ZTC_UPLOAD_TIMEOUT_MS,
  );
  const first = Array.isArray(uploaded) ? uploaded[0] : uploaded;

  if (first?.error || !first?.data) {
    throw new Error(first?.error?.message || "Failed to upload audio");
  }

  return getUploadThingFileUrl(first.data);
}

export async function transcribeAudioWithSource(formData: FormData, idx: number) {
  const mediaUrl = getString(formData, `MediaUrl${idx}`);
  const contentType = (getString(formData, `MediaContentType${idx}`) || "").toLowerCase();

  if (!mediaUrl) throw new Error("Audio media URL is missing");

  const buffer = await withZtcTimeout(
    fetchWhatsAppMediaAsBuffer(mediaUrl),
    "ztc_audio_media_fetch",
    ZTC_MEDIA_TIMEOUT_MS,
  );
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const [originalAudioUrl, transcript] = await Promise.all([
    uploadOriginalAudioBuffer(buffer, contentType),
    (async () => {
      const file = await toFile(buffer, `voice-message.${inferAudioExtension(contentType)}`);
      return withZtcTimeout(
        openai.audio.transcriptions.create({
          file,
          model: "gpt-4o-transcribe",
        }),
        "ztc_audio_transcription",
        ZTC_TRANSCRIPTION_TIMEOUT_MS,
      );
    })(),
  ]);

  return {
    text: transcript.text?.trim() || "",
    originalAudioUrl,
  };
}

export async function transcribeAudio(formData: FormData, idx: number) {
  return (await transcribeAudioWithSource(formData, idx)).text;
}

export async function extractDrawingInfo(imageUrl: string): Promise<DrawingExtraction> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await withZtcTimeout(
    openai.chat.completions.create({
      model: process.env.ZTC_VISION_MODEL || "gpt-5.4-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You validate ZTC factory drawing photos. Return only JSON with keys: isConstructionDrawing boolean, hasReadableProjectName boolean, hasReadableElementName boolean, hasReadableWorkList boolean, qualityOk boolean, projectName string|null, elementName string|null, totalAreaM2 number|null, workList string[], workItems array of {name string, amountM2 number|null}, issue string|null. Accept only readable precast/timber element production drawings. Ignore the large drawing views, dimensions, revision stamp, designer names, legends, and unrelated notes unless needed to confirm it is a drawing. Extract only from the framed tables at the bottom of the drawing: (1) the lower-left work list frame, (2) the area/info square immediately to the right of that work list, and (3) the right title block with project and drawing info. The work list is the lower-left frame and uses prefixes in this order when present: R5, R4, R3, R2, R1, TL, L1, L2, L3, L4, L5. Extract only rows from that lower-left work frame with a visible description after the hyphen; omit empty prefix rows. Preserve the exact drawing order. Include the prefix in the work name, for example \"R2 - Batten, 45x45mm\" or \"TL - 45x245 / Mineral wool\". ZTC drawings always use TL for timber frame work: normalize any prefix T, T1, or similar OCR mistake to TL, and never return T1. The total area is in the adjacent square/table to the right of the work list, usually labelled like \"Aptuvena panela kvadratura - 15.87m2\"; extract that number as totalAreaM2. If work-specific areas are not explicitly stated in the work list, set every workItems amountM2 to totalAreaM2. Project name must be extracted only from the value immediately after the exact title-block label \"Project name:\" or \"Project name :\". If that label or value is unreadable, set hasReadableProjectName=false and projectName=null. Element name must come from the exact title-block label \"Drawing name:\" when visible. Reject ordinary photos, selfies, documents without this drawing/title-block context, drawings without a readable project name, element name, work list, or total area, and unreadable/blurry photos. Preserve Latvian diacritics and original spelling in extracted names; do not transliterate.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Check this WhatsApp photo. Read only the bottom ZTC drawing tables: lower-left work list, adjacent total area square, and right title block. Return project name, drawing/element name, total area in m2, and the ordered work list.",
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    }),
    "ztc_drawing_extraction",
    ZTC_VISION_TIMEOUT_MS,
  );

  const content = response.choices[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("ZTC drawing extraction returned an empty response");
  }

  const parsed = parseJsonObject<DrawingExtraction | null>(content, null);
  if (!parsed) {
    throw new Error("ZTC drawing extraction returned invalid JSON");
  }

  return normalizeDrawingExtraction(parsed);
}

async function extractWorkInfo(
  text: string,
  allowedWorkOptions?: string[],
): Promise<WorkExtraction> {
  const normalized = text.trim();
  const { workOptions, unitOptions } = await getZtcDropdownOptions();
  const effectiveWorkOptions = normalizeZtcWorkOptions(
    allowedWorkOptions?.length ? allowedWorkOptions : workOptions,
  );

  if (!normalized) {
    return {
      isGibberish: true,
      isFinish: false,
      isAdditionalWork: false,
      additionalWorkDescription: null,
      workOption: null,
      amountCompleted: null,
      units: null,
      issue: "No speech was recognized.",
    };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await withZtcTimeout(
    openai.chat.completions.create({
      model: process.env.ZTC_TEXT_MODEL || "gpt-5.4-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `Classify a short worker WhatsApp transcript. Return only JSON with keys: isGibberish boolean, isFinish boolean, isAdditionalWork boolean, additionalWorkDescription string|null, workOption string|null, amountCompleted number|null, units string|null, issue string|null. Mark gibberish for random words, empty/noisy transcripts, or text with no understandable work meaning. Mark isFinish true if the worker says work is finished/done/completed. Mark isAdditionalWork true when the worker says "Papilddarbi", "papilddarbs", "saku papilddarbu", or a close Latvian derivative meaning additional work. For additionalWorkDescription, remove the additional-work keyword and keep the actual work description if present. For workOption, choose exactly one label from this allowed Darbi list if it clearly matches the worker's activity: ${JSON.stringify(effectiveWorkOptions)}. A drawing work prefixed with "TL" means timber frame / timberkarkass / karkass; when the worker says karkass, koka karkass, timber frame, or frame, match the most relevant TL option and return its exact label. Treat T and T1 prefixes as TL, and never return a T1 work option. If none clearly match, return null for workOption. For units, choose exactly one label from this allowed Mervieniba list if the worker mentions a completed quantity unit: ${JSON.stringify(unitOptions)}. If no allowed unit clearly matches, return null for units. Do not invent work options or unit values. If the worker says how much was completed, extract the numeric amount but only set units from the allowed list. Normalize obvious spoken numbers to digits, for example 'twelve panels' with allowed unit 'gab' -> amountCompleted 12, units 'gab', '8 square meters' with allowed unit 'm2' -> amountCompleted 8, units 'm2'. If no completed quantity is mentioned, use null for both amountCompleted and units.`,
        },
        { role: "user", content: normalized },
      ],
    }),
    "ztc_work_text_extraction",
    ZTC_TEXT_TIMEOUT_MS,
  );

  const extracted = parseJsonObject<WorkExtraction>(response.choices[0]?.message?.content, {
    isGibberish: true,
    isFinish: false,
    isAdditionalWork: false,
    additionalWorkDescription: null,
    workOption: null,
    amountCompleted: null,
    units: null,
    issue: "Could not understand the work message.",
  });

  return {
    ...extracted,
    isAdditionalWork: extracted.isAdditionalWork || hasPapilddarbiKeyword(normalized),
    workOption:
      normalizeAllowedWorkOption(extracted.workOption, effectiveWorkOptions) ??
      (hasFrameKeyword(normalized) && effectiveWorkOptions.filter(isTlWork).length === 1
        ? effectiveWorkOptions.filter(isTlWork)[0]
        : null),
    units: normalizeAllowedOption(extracted.units, unitOptions),
  };
}

async function getOpenZtcSession(workerId: string) {
  return prisma.sitediaryrecords.findFirst({
    where: {
      workerId,
      organizationId: ZTC_ORGANIZATION_ID,
      Date_Custom_2: null,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getLatestZtcDrawingContext(workerId: string) {
  return prisma.sitediaryrecords.findFirst({
    where: {
      workerId,
      organizationId: ZTC_ORGANIZATION_ID,
      Location: { not: null },
      Location_Custom_1: { not: null },
      NOT: {
        Location: "Papilddarbi",
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getRecentCompletedPhotoBatchSession(workerId: string) {
  const cutoff = new Date(Date.now() - PHOTO_BATCH_CONFIRM_WINDOW_MS);
  const session = await prisma.sitediaryrecords.findFirst({
    where: {
      workerId,
      organizationId: ZTC_ORGANIZATION_ID,
      Date_Custom_2: { gte: cutoff },
      Comments_Custom_1: { startsWith: PHOTO_BATCH_CONFIRM_PREFIX },
    },
    orderBy: { Date_Custom_2: "desc" },
  });

  return isRecentPhotoBatchConfirmation(session?.Comments_Custom_1) ? session : null;
}

function calculateHours(start: Date | null | undefined, end: Date) {
  if (!start) return undefined;
  const hours = (end.getTime() - start.getTime()) / 3_600_000;
  if (!Number.isFinite(hours) || hours < 0) return undefined;
  return Number(hours.toFixed(2));
}

async function completeSession(args: {
  session: OpenZtcSession;
  to: string | null;
  completedWork?: WorkExtraction | null;
  completedText?: string | null;
  finalComments?: string | null;
  originalAudioUrl?: string | null;
}) {
  const { session, to, completedWork, completedText, finalComments, originalAudioUrl } = args;
  const now = new Date();
  const timeInvolved = calculateHours(session.Date, now);
  const amountCompleted =
    session.Amounts != null
      ? session.Amounts
      : completedWork?.amountCompleted != null
        ? completedWork.amountCompleted
        : null;
  const finalWorkerComment = finalComments?.trim()
    ? await polishZtcCommentBlock(finalComments)
    : await buildPolishedZtcUserComments({
      startText: getSessionStartMessage(session),
      finishText: completedText,
    });

  const updated = await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Date_Custom_2: now,
      TimeInvolved: timeInvolved,
      Amounts: amountCompleted ?? undefined,
      Units: "m2",
      Comments_Custom_1: photoBatchMarker(),
      Comments: finalWorkerComment,
      originalAudioUrl: session.originalAudioUrl ?? originalAudioUrl ?? undefined,
    },
  });

  logZtcSession("session_completed", {
    session: updated,
    details: {
      timeInvolved,
      amountCompleted,
      comments: finalWorkerComment,
    },
  });

  await sendZtcMessage(
    to,
    `Darbs pabeigts un saglabāts: ${formatSessionWork(session) || "darbs"}. Reģistrētais laiks: ${timeInvolved ?? 0} stundas.`,
  );
}

async function askForTlDiagonals(args: {
  session: OpenZtcSession;
  to: string | null;
  completedText?: string | null;
  originalAudioUrl?: string | null;
}) {
  const completedText = args.completedText?.trim() || "";

  const updated = await prisma.sitediaryrecords.update({
    where: { id: args.session.id },
    data: {
      Comments_Custom_1: `${DIAGONAL_FIRST_PHOTO_PENDING_PREFIX} ${JSON.stringify({ completedText })}`,
      Units: "m2",
      Amounts: args.session.Amounts ?? undefined,
      originalAudioUrl: args.session.originalAudioUrl ?? args.originalAudioUrl ?? undefined,
    },
  });

  logZtcSession("tl_diagonal_flow_started", {
    session: updated,
    details: { completedText },
  });

  await sendZtcMessage(
    args.to,
    `Darbs pabeigts: ${formatSessionWork(args.session) || "TL/karkasa darbs"}. Pirms noslēgšanas lūdzu atsūtiet foto ar pirmās rāmja diagonāles mērījumu.`,
  );
}

async function finishSessionOrAskTlDiagonals(args: {
  session: OpenZtcSession;
  to: string | null;
  completedWork?: WorkExtraction | null;
  completedText?: string | null;
  originalAudioUrl?: string | null;
}) {
  if (isTlWork(args.session.Works)) {
    await askForTlDiagonals({
      session: args.session,
      to: args.to,
      completedText: args.completedText,
      originalAudioUrl: args.originalAudioUrl,
    });
    return;
  }

  await completeSession(args);
}

async function handleDiagonalMeasurementText(args: {
  session: OpenZtcSession;
  text: string;
  to: string | null;
}) {
  const completedText = readMarkerPayload(args.session.Comments_Custom_1, DIAGONALS_PENDING_PREFIX);
  const diagonals = parseDiagonalNumbers(args.text);

  if (!diagonals) {
    await sendZtcMessage(args.to, "Neatradu 2 diagonāļu skaitļus. Lūdzu, atsūtiet abus mērījumus, piemēram: 5240 5238.");
    return;
  }

  const payload = {
    completedText,
    diagonalA: diagonals[0],
    diagonalB: diagonals[1],
  };

  await prisma.sitediaryrecords.update({
    where: { id: args.session.id },
    data: {
      Comments_Custom_1: `${DIAGONALS_CONFIRM_PREFIX} ${JSON.stringify(payload)}`,
    },
  });

  await sendZtcMessage(
    args.to,
    `Saņēmu diagonāļu mērījumus: ${payload.diagonalA} un ${payload.diagonalB}. Vai pareizi? Atbildiet "jā" vai "nē".`,
  );
}

async function handleDiagonalConfirmationText(args: {
  session: OpenZtcSession;
  text: string;
  to: string | null;
}) {
  const rawPayload = readMarkerPayload(args.session.Comments_Custom_1, DIAGONALS_CONFIRM_PREFIX);
  const payload = parseJsonObject<{
    completedText: string;
    diagonalA: number;
    diagonalB: number;
  }>(rawPayload, {
    completedText: "",
    diagonalA: 0,
    diagonalB: 0,
  });

  const replacementDiagonals = parseDiagonalNumbers(args.text);
  if (replacementDiagonals && !isPositiveConfirmation(args.text) && !isNegativeConfirmation(args.text)) {
    await handleDiagonalMeasurementText({
      session: {
        ...args.session,
        Comments_Custom_1: `${DIAGONALS_PENDING_PREFIX} ${payload.completedText}`,
      },
      text: args.text,
      to: args.to,
    });
    return;
  }

  if (isNegativeConfirmation(args.text)) {
    await prisma.sitediaryrecords.update({
      where: { id: args.session.id },
      data: {
        Comments_Custom_1: `${DIAGONALS_PENDING_PREFIX} ${payload.completedText}`,
      },
    });
    await sendZtcMessage(args.to, "Labi, atsūtiet pareizos 2 diagonāļu mērījumus vēlreiz.");
    return;
  }

  if (!isPositiveConfirmation(args.text)) {
    await sendZtcMessage(args.to, `Lūdzu, apstipriniet mērījumus ${payload.diagonalA} un ${payload.diagonalB} ar "jā" vai "nē".`);
    return;
  }

  await completeSession({
    session: args.session,
    to: args.to,
    finalComments: buildDiagonalComment({
      session: args.session,
      completedText: payload.completedText,
      diagonalA: payload.diagonalA,
      diagonalB: payload.diagonalB,
    }),
  });
}

async function saveDiagonalMeasurePhoto(args: {
  worker: ZtcWorker;
  publicUrl: string;
  session: OpenZtcSession;
  label: string;
}) {
  const { worker, publicUrl, session, label } = args;

  await prisma.photos.create({
    data: {
      Date: new Date(),
      URL: publicUrl,
      fileUrl: publicUrl,
      Comment: [
        session.Location ?? "",
        session.Location_Custom_1 ?? "",
        session.Works ?? "",
        label,
        worker.name ?? "",
        worker.surname ?? "",
      ]
        .map((part) => String(part).trim())
        .filter(Boolean)
        .join(" - "),
      Location: session.Location ?? null,
      workerId: worker.id,
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
    },
  });
}

async function handleTlDiagonalMeasureText(args: {
  session: OpenZtcSession;
  text: string;
  to: string | null;
}) {
  const state = args.session.Comments_Custom_1;

  if (state?.startsWith(DIAGONAL_FIRST_PHOTO_PENDING_PREFIX)) {
    await sendZtcMessage(args.to, "Lūdzu, vispirms atsūtiet pirmās rāmja diagonāles foto.");
    return;
  }

  if (state?.startsWith(DIAGONAL_SECOND_PHOTO_PENDING_PREFIX)) {
    await sendZtcMessage(args.to, "Lūdzu, vispirms atsūtiet otrās rāmja diagonāles foto.");
    return;
  }

  if (state?.startsWith(DIAGONAL_FIRST_MEASURE_PENDING_PREFIX)) {
    const measure = parseDiagonalMeasureMm(args.text);
    if (measure == null) {
      await sendZtcMessage(args.to, "Neatradu mērījumu. Lūdzu, ierakstiet pirmās diagonāles mērījumu mm, piemēram: 5240.");
      return;
    }

    const payload = {
      ...readDiagonalPhotoMeasurePayload(state, DIAGONAL_FIRST_MEASURE_PENDING_PREFIX),
      firstMeasureMm: measure,
    };

    const updated = await prisma.sitediaryrecords.update({
      where: { id: args.session.id },
      data: {
        Comments_Custom_1: `${DIAGONAL_SECOND_PHOTO_PENDING_PREFIX} ${JSON.stringify(payload)}`,
      },
    });

    logZtcSession("tl_diagonal_one_measured", {
      session: updated,
      details: { measureMm: measure },
    });

    await sendZtcMessage(args.to, `Pirmās diagonāles mērījums: ${measure} mm. Tagad atsūtiet foto ar otrās rāmja diagonāles mērījumu.`);
    return;
  }

  if (state?.startsWith(DIAGONAL_SECOND_MEASURE_PENDING_PREFIX)) {
    const measure = parseDiagonalMeasureMm(args.text);
    if (measure == null) {
      await sendZtcMessage(args.to, "Neatradu mērījumu. Lūdzu, ierakstiet otrās diagonāles mērījumu mm, piemēram: 5238.");
      return;
    }

    const payload = {
      ...readDiagonalPhotoMeasurePayload(state, DIAGONAL_SECOND_MEASURE_PENDING_PREFIX),
      secondMeasureMm: measure,
    };

    logZtcSession("tl_diagonal_two_measured", {
      session: args.session,
      details: { measureMm: measure },
    });

    await sendTypingIndicator(args.to);

    await completeSession({
      session: args.session,
      to: args.to,
      finalComments: buildDiagonalPhotoMeasureComment({
        session: args.session,
        payload,
      }),
    });
  }
}

async function handleTlDiagonalPhoto(args: {
  formData: FormData;
  idx: number;
  to: string | null;
  worker: ZtcWorker;
  session: OpenZtcSession;
}) {
  const state = args.session.Comments_Custom_1;

  if (state?.startsWith(DIAGONAL_FIRST_MEASURE_PENDING_PREFIX)) {
    await sendZtcMessage(args.to, "Pirmās diagonāles foto jau ir saņemts. Lūdzu, ierakstiet pirmās diagonāles mērījumu mm.");
    return;
  }

  if (state?.startsWith(DIAGONAL_SECOND_MEASURE_PENDING_PREFIX)) {
    await sendZtcMessage(args.to, "Otrās diagonāles foto jau ir saņemts. Lūdzu, ierakstiet otrās diagonāles mērījumu mm.");
    return;
  }

  if (state?.startsWith(DIAGONAL_FIRST_PHOTO_PENDING_PREFIX)) {
    const image = await uploadMediaImage(args.formData, args.idx);
    const payload = {
      ...readDiagonalPhotoMeasurePayload(state, DIAGONAL_FIRST_PHOTO_PENDING_PREFIX),
      firstPhotoUrl: image.publicUrl,
    };
    const nextPhotos = [...(args.session.Photos ?? []), image.publicUrl];

    const updated = await prisma.sitediaryrecords.update({
      where: { id: args.session.id },
      data: {
        Photos: nextPhotos,
        Comments_Custom_1: `${DIAGONAL_FIRST_MEASURE_PENDING_PREFIX} ${JSON.stringify(payload)}`,
      },
    });

    logZtcSession("tl_diagonal_one_photo_saved", {
      session: updated,
      worker: args.worker,
      details: { photoUrl: image.publicUrl },
    });

    await saveDiagonalMeasurePhoto({
      worker: args.worker,
      publicUrl: image.publicUrl,
      session: args.session,
      label: "Pirmā diagonāle",
    });

    await sendZtcMessage(args.to, "Pirmās diagonāles foto saņemts. Lūdzu, ierakstiet pirmās diagonāles mērījumu mm, piemēram: 5240.");
    return;
  }

  if (state?.startsWith(DIAGONAL_SECOND_PHOTO_PENDING_PREFIX)) {
    const image = await uploadMediaImage(args.formData, args.idx);
    const payload = {
      ...readDiagonalPhotoMeasurePayload(state, DIAGONAL_SECOND_PHOTO_PENDING_PREFIX),
      secondPhotoUrl: image.publicUrl,
    };
    const nextPhotos = [...(args.session.Photos ?? []), image.publicUrl];

    const updated = await prisma.sitediaryrecords.update({
      where: { id: args.session.id },
      data: {
        Photos: nextPhotos,
        Comments_Custom_1: `${DIAGONAL_SECOND_MEASURE_PENDING_PREFIX} ${JSON.stringify(payload)}`,
      },
    });

    logZtcSession("tl_diagonal_two_photo_saved", {
      session: updated,
      worker: args.worker,
      details: { photoUrl: image.publicUrl },
    });

    await saveDiagonalMeasurePhoto({
      worker: args.worker,
      publicUrl: image.publicUrl,
      session: args.session,
      label: "Otrā diagonāle",
    });

    await sendZtcMessage(args.to, "Otrās diagonāles foto saņemts. Lūdzu, ierakstiet otrās diagonāles mērījumu mm, piemēram: 5238.");
  }
}

async function saveCompletedWorkPhoto(args: {
  worker: ZtcWorker;
  publicUrl: string;
  session: OpenZtcSession;
}) {
  const { worker, publicUrl, session } = args;

  await prisma.photos.create({
    data: {
      Date: new Date(),
      URL: publicUrl,
      fileUrl: publicUrl,
      Comment: [
        session.Location ?? "",
        session.Location_Custom_1 ?? "",
        session.Works ?? "",
        worker.name ?? "",
        worker.surname ?? "",
      ]
        .map((part) => String(part).trim())
        .filter(Boolean)
        .join(" - "),
      Location: session.Location ?? null,
      workerId: worker.id,
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
    },
  });
}

async function appendPhotosToRecentCompletedSession(args: {
  formData: FormData;
  idxs: number[];
  worker: ZtcWorker;
}) {
  const session = await getRecentCompletedPhotoBatchSession(args.worker.id);
  if (!session) return false;

  await sendTypingIndicator(getString(args.formData, "From"));

  const images = await uploadZtcImages(args.formData, args.idxs, "recent_completed_append");
  const uploadedUrls = images.map((image) => image.publicUrl);
  if (uploadedUrls.length === 0) {
    logZtcSession("completed_work_late_photos_append_skipped", {
      session,
      worker: args.worker,
      details: { requestedPhotoCount: args.idxs.length },
    });
    return true;
  }

  const nextPhotos = [...(session.Photos ?? []), ...uploadedUrls];

  const updated = await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Photos: nextPhotos,
      Comments_Custom_1: photoBatchMarker(),
    },
  });

  await Promise.all(
    uploadedUrls.map((publicUrl) =>
      saveCompletedWorkPhoto({
        worker: args.worker,
        publicUrl,
        session,
      }),
    ),
  );

  logZtcSession("completed_work_late_photos_appended", {
    session: updated,
    worker: args.worker,
    details: { addedPhotoCount: uploadedUrls.length, photoUrls: uploadedUrls },
  });

  return true;
}

async function handleDrawingPhoto(args: {
  formData: FormData;
  idx: number;
  to: string | null;
  worker: ZtcWorker;
}) {
  const { formData, idx, to, worker } = args;

  const existing = await getOpenZtcSession(worker.id);
  if (existing?.Works) {
    await sendZtcMessage(to, `Jums jau ir aktīva ZTC darba sesija: ${formatSessionWork(existing) || "darbs"}. Lūdzu, pabeidziet to pirms jauna rasējuma sūtīšanas.`);
    return;
  }

  logZtcSession("drawing_photo_received", {
    worker,
    details: { mediaIndex: idx },
  });

  await sendTypingIndicator(to);

  logZtcSession("drawing_photo_upload_started", {
    worker,
    details: { mediaIndex: idx },
  });
  const image = await uploadMediaImage(formData, idx);
  logZtcSession("drawing_photo_upload_completed", {
    worker,
    details: { mediaIndex: idx, publicUrl: image.publicUrl, contentType: image.contentType },
  });

  logZtcSession("drawing_extraction_started", {
    worker,
    details: { imageUrl: image.publicUrl },
  });
  const extraction = await extractDrawingInfo(image.publicUrl);
  logZtcSession("drawing_extraction_completed", {
    worker,
    details: {
      isConstructionDrawing: extraction.isConstructionDrawing,
      hasReadableProjectName: extraction.hasReadableProjectName,
      hasReadableElementName: extraction.hasReadableElementName,
      hasReadableWorkList: extraction.hasReadableWorkList,
      qualityOk: extraction.qualityOk,
      projectName: extraction.projectName,
      elementName: extraction.elementName,
      workCount: extraction.workList.length,
      issue: extraction.issue,
    },
  });

  if (
    !extraction.isConstructionDrawing ||
    !extraction.qualityOk ||
    !extraction.hasReadableProjectName ||
    !extraction.hasReadableElementName ||
    !extraction.hasReadableWorkList ||
    !extraction.projectName ||
    !extraction.elementName ||
    extraction.totalAreaM2 == null ||
    extraction.workList.length === 0
  ) {
    await sendZtcMessage(
      to,
      "Lūdzu, atsūtiet skaidru ražošanas rasējuma foto, kur redzams projekta nosaukums, elementa numurs, kopplatība m2 un darbu saraksts.",
    );
    return;
  }

  const drawingWorks = extraction.workList.join("; ");
  const drawingMetadata = JSON.stringify(buildDrawingMetadata(extraction));

  if (existing && !existing.Works) {
    const updated = await prisma.sitediaryrecords.update({
      where: { id: existing.id },
      data: {
        Date_Custom_1: new Date(),
        Location: extraction.projectName,
        Location_Custom_1: extraction.elementName,
        Works_Custom_1: drawingWorks,
        Comments_Custom_2: drawingMetadata,
        Comments: null,
        Photos: [image.publicUrl],
      },
    });

    logZtcSession("drawing_context_updated", {
      session: updated,
      worker,
      details: {
        drawingPhotoUrl: image.publicUrl,
        extractedWorks: extraction.workList,
      },
    });
  } else {
    const created = await prisma.sitediaryrecords.create({
      data: {
        workerId: worker.id,
        siteId: ZTC_SITE_ID,
        organizationId: ZTC_ORGANIZATION_ID,
        Date_Custom_1: new Date(),
        Location: extraction.projectName,
        Location_Custom_1: extraction.elementName,
        Works_Custom_1: drawingWorks,
        Comments_Custom_2: drawingMetadata,
        Comments: null,
        originalUserComment: `${workerFullName(worker)} : rasējuma foto`,
        Photos: [image.publicUrl],
      },
    });

    logZtcSession("drawing_context_created", {
      session: created,
      worker,
      details: {
        drawingPhotoUrl: image.publicUrl,
        extractedWorks: extraction.workList,
      },
    });
  }

  await sendZtcMessage(
    to,
    `Rasējums pieņemts.\nProjekts: ${extraction.projectName}\nElementa numurs: ${extraction.elementName}\nPlatība: ${extraction.totalAreaM2} m2\nDarbi:\n${formatExtractedWorksForMessage(extraction)}\n\nTagad atsūtiet balss ziņu vai tekstu ar darbu, ko sākat darīt.`,
  );
}

async function createSessionFromLatestDrawing(worker: ZtcWorker) {
  const previous = await getLatestZtcDrawingContext(worker.id);
  if (!previous) return null;

  const created = await prisma.sitediaryrecords.create({
    data: {
      workerId: worker.id,
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
      Date_Custom_1: new Date(),
      Location: previous.Location,
      Location_Custom_1: previous.Location_Custom_1,
      Works_Custom_1: previous.Works_Custom_1,
      Comments_Custom_2: previous.Comments_Custom_2,
      Comments: null,
      originalUserComment: `${workerFullName(worker)} : atkārtots darbs pie tā paša rasējuma`,
      Photos: previous.Photos?.[0] ? [previous.Photos[0]] : [],
    },
  });

  logZtcSession("session_created_from_latest_drawing", {
    session: created,
    worker,
    details: { previousRecordId: previous.id },
  });

  return created;
}

async function createAdditionalWorkSession(args: {
  worker: ZtcWorker;
  work: WorkExtraction;
  text: string;
  originalAudioUrl?: string | null;
}) {
  const { worker, work, text, originalAudioUrl } = args;
  const { workOptions } = await getZtcDropdownOptions();
  const workOption = work.workOption ?? getFallbackOtherWorkOption(workOptions);
  const now = new Date();
  const comments = await buildPolishedZtcUserComments({ startText: text });

  const created = await prisma.sitediaryrecords.create({
    data: {
      workerId: worker.id,
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
      Date: now,
      Date_Custom_1: now,
      Location: "Papilddarbi",
      Works: workOption,
      Units: "m2",
      Amounts: work.amountCompleted ?? undefined,
      Comments: comments,
      originalUserComment: `${workerFullName(worker)} : ${text}`,
      originalAudioUrl: originalAudioUrl ?? undefined,
    },
  });

  logZtcSession("additional_work_started", {
    session: created,
    worker,
    details: { startText: text },
  });

  return created;
}

async function handleWorkText(args: {
  text: string;
  to: string | null;
  worker: ZtcWorker;
  originalAudioUrl?: string | null;
}) {
  const { text, to, worker, originalAudioUrl } = args;
  const openSession = await getOpenZtcSession(worker.id);

  if (openSession && isDiagonalPhotoMeasureFlow(openSession.Comments_Custom_1)) {
    await handleTlDiagonalMeasureText({ session: openSession, text, to });
    return;
  }

  const isAdditionalWorkRequest = hasPapilddarbiKeyword(text);
  const latestDrawingContext =
    openSession || isAdditionalWorkRequest
      ? null
      : await getLatestZtcDrawingContext(worker.id);
  const workOptionsForSession = getSessionWorkOptions(openSession ?? latestDrawingContext);
  const work = await extractWorkInfo(text, workOptionsForSession);

  if (work.isGibberish) {
    await sendZtcMessage(to, "Neizdevās saprast ziņu. Lūdzu, mēģiniet vēlreiz.");
    return;
  }

  if (work.isAdditionalWork && !work.isFinish) {
    if (openSession?.Location === "Papilddarbi" && openSession.Works) {
      await sendZtcMessage(
        to,
        `Papilddarbs jau ir aktīva sesija: ${formatSessionWork(openSession) || "darbs"}. Lūdzu, pabeidziet to pirms jauna papilddarba sākšanas.`,
      );
      return;
    }

    await createAdditionalWorkSession({ worker, work, text, originalAudioUrl });
    await sendZtcMessage(
      to,
      `Papilddarbs sākts${work.workOption ? `: ${work.workOption}` : ""}. Kad darbs ir pabeigts, atsūtiet foto un pasakiet, ka darbs ir pabeigts.`,
    );
    return;
  }

  const session = work.isFinish
    ? openSession
    : openSession ?? (await createSessionFromLatestDrawing(worker));

  if (!session) {
    await sendZtcMessage(to, "Lūdzu, sāciet ar skaidru ražošanas rasējuma foto.");
    return;
  }

  const now = new Date();

  if (work.isFinish) {
    await sendTypingIndicator(to);

    if (!session.Works) {
      await sendZtcMessage(to, "Rasējums ir saņemts, bet vēl nav darba sākšanas ziņas. Lūdzu, pasakiet vai uzrakstiet, kādu darbu sākat.");
      return;
    }

    if (!hasCompletedWorkPhoto(session)) {
      const updated = await prisma.sitediaryrecords.update({
        where: { id: session.id },
        data: {
          Amounts: session.Amounts ?? undefined,
          Units: "m2",
          Comments_Custom_1: `${FINISH_PENDING_PREFIX} ${text}`,
          originalAudioUrl: session.originalAudioUrl ?? originalAudioUrl ?? undefined,
        },
      });

      logZtcSession("finish_voice_waiting_for_photo", {
        session: updated,
        worker,
        details: { finishText: text },
      });

      await sendZtcMessage(
        to,
        `Pabeigšanas ziņa saņemta par darbu: ${formatSessionWork(session) || "darbs"}. Lūdzu, atsūtiet pabeigta darba foto.`,
      );
      return;
    }

    await finishSessionOrAskTlDiagonals({
      session,
      to,
      completedWork: work,
      completedText: text,
      originalAudioUrl,
    });
    return;
  }

  if (session.Works) {
    if (session.Comments_Custom_1?.startsWith(PHOTO_PENDING_FINISH_PREFIX)) {
      await sendZtcMessage(
        to,
        `Pabeigta darba foto ir saņemts darbam: ${formatSessionWork(session) || "darbs"}. Lūdzu, pasakiet vai uzrakstiet, ka darbs ir pabeigts, lai es varu noslēgt sesiju.`,
      );
      return;
    }

    await sendZtcMessage(
      to,
      `Jums jau ir aktīva darba sesija: ${formatSessionWork(session) || "darbs"}. Lūdzu, vispirms atsūtiet pabeigta darba foto un pasakiet, ka darbs ir pabeigts.`,
    );
    return;
  }

  if (!work.workOption) {
    await sendZtcMessage(to, "Neatradu atbilstošu darbu sarakstā. Lūdzu, pasakiet vai uzrakstiet darbu vēlreiz.");
    return;
  }

  const amountM2 = getSessionWorkAmountM2(session, work.workOption);
  const comments = await buildPolishedZtcUserComments({ startText: text });

  const updated = await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Date: now,
      Works: work.workOption,
      Units: "m2",
      Amounts: amountM2 ?? undefined,
      Comments: comments,
      originalUserComment: `${workerFullName(worker)} : ${text}`,
      originalAudioUrl: session.originalAudioUrl ?? originalAudioUrl ?? undefined,
    },
  });

  logZtcSession("work_started", {
    session: updated,
    worker,
    details: { startText: text, amountM2 },
  });

  await sendZtcMessage(
    to,
    `Sākts darbs: ${work.workOption}\nProjekts: ${session.Location}\nElementa numurs: ${session.Location_Custom_1}\nApjoms: ${amountM2 ?? 0} m2\nKad darbs ir pabeigts, atsūtiet pabeigta darba foto un pasakiet, ka darbs ir pabeigts.`,
  );
}

async function handleFinishedPhoto(args: {
  formData: FormData;
  idxs: number[];
  to: string | null;
  worker: ZtcWorker;
  caption: string;
}) {
  const { formData, idxs, to, worker, caption } = args;
  const firstIdx = idxs[0];
  const session = await getOpenZtcSession(worker.id);

  if (!session?.Works) {
    await sendZtcMessage(to, "Pirms pabeigta darba foto, lūdzu, atsūtiet rasējuma foto un balss ziņu vai tekstu par darba sākšanu.");
    return;
  }

  if (firstIdx == null) {
    await sendZtcMessage(to, "Neatradu foto. Lūdzu, atsūtiet pabeigta darba foto vēlreiz.");
    return;
  }

  if (isDiagonalPhotoMeasureFlow(session.Comments_Custom_1)) {
    await handleTlDiagonalPhoto({ formData, idx: firstIdx, to, worker, session });
    return;
  }

  await sendTypingIndicator(to);

  const images = await uploadZtcImages(formData, idxs, "completed_work_photos");
  const uploadedUrls = images.map((image) => image.publicUrl);
  if (uploadedUrls.length === 0) {
    await sendZtcMessage(to, "Neizdevās saglabāt pabeigtā darba foto. Lūdzu, atsūtiet foto vēlreiz.");
    return;
  }

  const nextPhotos = [...(session.Photos ?? []), ...uploadedUrls];
  const alreadyConfirmedPhotoBatch = isRecentPhotoBatchConfirmation(session.Comments_Custom_1);
  const shouldPreservePendingState =
    session.Comments_Custom_1?.startsWith(FINISH_PENDING_PREFIX) ||
    isDiagonalPhotoMeasureFlow(session.Comments_Custom_1);
  const nextPhotoState = shouldPreservePendingState
    ? session.Comments_Custom_1
    : photoBatchMarker();

  await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Photos: nextPhotos,
      Comments_Custom_1: nextPhotoState,
    },
  });

  logZtcSession("completed_work_photo_saved", {
    session: {
      ...session,
      Photos: nextPhotos,
    },
    worker,
    details: { photoUrls: uploadedUrls, photoCount: uploadedUrls.length, caption },
  });

  await Promise.all(
    uploadedUrls.map((publicUrl) =>
      saveCompletedWorkPhoto({
        worker,
        publicUrl,
        session,
      }),
    ),
  );

  if (session.Comments_Custom_1?.startsWith(FINISH_PENDING_PREFIX)) {
    await sendTypingIndicator(to);

    const completedText = session.Comments_Custom_1.replace(
      FINISH_PENDING_PREFIX,
      "",
    ).trim();

    await finishSessionOrAskTlDiagonals({
      session: {
        ...session,
        Photos: nextPhotos,
      },
      to,
      completedText,
    });
    return;
  }

  if (session.Comments_Custom_1?.startsWith(DIAGONALS_PENDING_PREFIX)) {
    await sendZtcMessage(to, "Foto saņemts. Lūdzu, atsūtiet 2 rāmja diagonāļu mērījumus.");
    return;
  }

  if (session.Comments_Custom_1?.startsWith(DIAGONALS_CONFIRM_PREFIX)) {
    const rawPayload = readMarkerPayload(session.Comments_Custom_1, DIAGONALS_CONFIRM_PREFIX);
    const payload = parseJsonObject<{ diagonalA: number; diagonalB: number }>(rawPayload, {
      diagonalA: 0,
      diagonalB: 0,
    });
    await sendZtcMessage(to, `Foto saņemts. Lūdzu, apstipriniet diagonāļu mērījumus ${payload.diagonalA} un ${payload.diagonalB} ar "jā" vai "nē".`);
    return;
  }

  if (caption.trim()) {
    await handleWorkText({ text: caption, to, worker });
    return;
  }

  if (alreadyConfirmedPhotoBatch) {
    logZtcSession("completed_work_photo_confirmation_suppressed", {
      session: {
        ...session,
        Photos: nextPhotos,
      },
      worker,
      details: { addedPhotoCount: uploadedUrls.length },
    });
    return;
  }

  await sendZtcMessage(
    to,
    `Saņemti ${uploadedUrls.length} pabeigta darba foto darbam: ${formatSessionWork(session) || "darbs"}. Lūdzu, atsūtiet balss ziņu vai tekstu, ka darbs ir pabeigts.`,
  );
}

export async function handleZtcWorkerRoute(args: {
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
      const openSession = await getOpenZtcSession(worker.id);
      if (openSession?.Works) {
        await handleFinishedPhoto({ formData, idxs: imageIndexes, to: from, worker, caption: body });
      } else if (await appendPhotosToRecentCompletedSession({ formData, idxs: imageIndexes, worker })) {
        // The worker sent multiple completion photos as separate WhatsApp messages.
      } else {
        await handleDrawingPhoto({ formData, idx: imageIdx, to: from, worker });
      }
      return;
    }

    if (audioIdx >= 0) {
      const transcript = await transcribeAudioWithSource(formData, audioIdx);
      await handleWorkText({
        text: transcript.text,
        to: from,
        worker,
        originalAudioUrl: transcript.originalAudioUrl,
      });
      return;
    }

    if (body) {
      await handleWorkText({ text: body, to: from, worker });
      return;
    }

    await sendZtcMessage(from, "Lūdzu, atsūtiet rasējuma foto, balss ziņu, tekstu vai pabeigta darba foto.");
  } catch (error) {
    console.error("[ZTC workflow] failed", error);
    if (isZtcTimeoutError(error)) {
      logZtcSession("workflow_timeout", {
        worker,
        details: {
          message: error instanceof Error ? error.message : String(error),
          imageIdx,
          audioIdx,
          hasBody: Boolean(body),
        },
      });
      await sendZtcMessage(
        from,
        imageIdx >= 0
          ? "Tīkla vai foto apstrādes kļūda. Lūdzu, atsūtiet foto vēlreiz."
          : "Ziņas apstrāde aizņēma pārāk ilgu laiku. Lūdzu, mēģiniet vēlreiz pēc brīža.",
      );
      return;
    }

    await sendZtcMessage(
      from,
      imageIdx >= 0
        ? "Tīkla vai foto apstrādes kļūda. Lūdzu, atsūtiet foto vēlreiz."
        : "Atvainojiet, ZTC plūsma nevarēja apstrādāt šo ziņu. Lūdzu, mēģiniet vēlreiz.",
    );
  }
}
