import { UTApi } from "uploadthing/server";
import OpenAI, { toFile } from "openai";
import { prisma } from "@/lib/utils/db";
import {
  fetchTwilioMediaAsBuffer,
  getString,
} from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage } from "@/lib/utils/whatsapp-helpers/shared/twillio";
import ztcSiteDiaryRecordsMap from "@/components/sitediary/configs/ZTC/siteDiaryRecordsMap.json";
import { getConfig } from "@/server/actions/site-diary-actions";

export const ZTC_ORGANIZATION_ID = "21511437-f6ab-402b-aa2d-613110eb61da";
const ZTC_SITE_ID = "4c26c435-dd19-49d7-ad60-981eb1eeaeff";
const FINISH_PENDING_PREFIX = "__ZTC_FINISH_PENDING__";
const PHOTO_PENDING_FINISH_PREFIX = "__ZTC_PHOTO_PENDING_FINISH__";
const DIAGONALS_PENDING_PREFIX = "__ZTC_DIAGONALS_PENDING__";
const DIAGONALS_CONFIRM_PREFIX = "__ZTC_DIAGONALS_CONFIRM__";

type ZtcWorker = {
  id: string;
  name: string | null;
  surname: string | null;
  phone: string | null;
  siteId: string | null;
  organizationId: string | null;
};

type DrawingExtraction = {
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
  const config = ((await getConfig(ZTC_SITE_ID)) ??
    ztcSiteDiaryRecordsMap) as ZtcConfigMap;

  return {
    workOptions: normalizeZtcWorkOptions(getDropdownLabels(config, "Works")),
    unitOptions: getDropdownLabels(config, "Units"),
  };
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

function workerFullName(worker: ZtcWorker) {
  return [worker.name, worker.surname].filter(Boolean).join(" ").trim() || "Darbinieks";
}

function findFirstMediaIndex(formData: FormData, numMedia: number, prefix: string) {
  for (let i = 0; i < numMedia; i += 1) {
    const contentType = (getString(formData, `MediaContentType${i}`) || "").toLowerCase();
    if (contentType.startsWith(prefix)) return i;
  }

  return -1;
}

function inferAudioExtension(contentType: string) {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("m4a") || normalized.includes("mp4")) return "m4a";
  return "ogg";
}

function parseJsonObject<T>(value: string | null | undefined, fallback: T): T {
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
  const baseComment = args.session.Comments?.trim();
  const finishComment = args.completedText.trim();
  return [
    baseComment,
    finishComment ? `Pabeigsana: ${finishComment}` : null,
    `Rama diagonales: ${args.diagonalA} un ${args.diagonalB}`,
  ]
    .filter(Boolean)
    .join("\n");
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

function buildDrawingMetadata(extraction: DrawingExtraction): ZtcDrawingMetadata {
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

function formatExtractedWorksForMessage(extraction: DrawingExtraction) {
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

async function uploadMediaImage(formData: FormData, idx: number) {
  const mediaUrl = getString(formData, `MediaUrl${idx}`);
  const contentType = (getString(formData, `MediaContentType${idx}`) || "image/jpeg").toLowerCase();
  const mediaProvider = (getString(formData, `MediaProvider${idx}`) || "").toLowerCase();

  if (!mediaUrl) throw new Error("Image media URL is missing");

  const buffer = await fetchTwilioMediaAsBuffer(
    mediaUrl,
    mediaProvider === "meta" ? "meta" : "twilio",
  );
  const ext = contentType.split("/")[1] || "jpg";
  const file = new File([buffer], `ztc_whatsapp_${Date.now()}.${ext}`, {
    type: contentType,
  });

  const uploaded = await utapi.uploadFiles([file]);
  const first = Array.isArray(uploaded) ? uploaded[0] : uploaded;

  if (first?.error || !first?.data) {
    throw new Error(first?.error?.message || "Failed to upload image");
  }

  return {
    publicUrl: first.data.ufsUrl ?? first.data.url,
    contentType,
  };
}

async function transcribeAudio(formData: FormData, idx: number) {
  const mediaUrl = getString(formData, `MediaUrl${idx}`);
  const contentType = (getString(formData, `MediaContentType${idx}`) || "").toLowerCase();
  const mediaProvider = (getString(formData, `MediaProvider${idx}`) || "").toLowerCase();

  if (!mediaUrl) throw new Error("Audio media URL is missing");

  const buffer = await fetchTwilioMediaAsBuffer(
    mediaUrl,
    mediaProvider === "meta" ? "meta" : "twilio",
  );
  const file = await toFile(buffer, `voice-message.${inferAudioExtension(contentType)}`);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const transcript = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-transcribe",
  });

  return transcript.text?.trim() || "";
}

async function extractDrawingInfo(imageUrl: string): Promise<DrawingExtraction> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: process.env.ZTC_VISION_MODEL || "gpt-5.1",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You validate photos sent by factory workers. Return only JSON with keys: isConstructionDrawing boolean, hasReadableProjectName boolean, hasReadableElementName boolean, hasReadableWorkList boolean, qualityOk boolean, projectName string|null, elementName string|null, totalAreaM2 number|null, workList string[], workItems array of {name string, amountM2 number|null}, issue string|null. Accept only construction/shop/precast/timber element drawings. Reject ordinary site photos, selfies, documents without drawing context, drawings without a readable project name, drawings without a readable element name, drawings without a readable list/table/notes of work operations, drawings without a readable total element area, and unreadable/blurry photos. Extract the project name, element name, total element area in m2, and visible work operations exactly as visible when possible. Preserve the exact order of work operations as they appear in the drawing. ZTC drawings always use TL positions for timber frame work: normalize any work prefix T or T1 to TL, and never return T1. If work-specific areas are not stated, use the total element area for each workItems amountM2.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Check this WhatsApp photo. Is it a readable construction drawing with project name, element name, total area in m2, and a readable work/operation list?",
          },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
  });

  return normalizeDrawingExtraction(
    parseJsonObject<DrawingExtraction>(response.choices[0]?.message?.content, {
      isConstructionDrawing: false,
      hasReadableProjectName: false,
      hasReadableElementName: false,
      hasReadableWorkList: false,
      qualityOk: false,
      projectName: null,
      elementName: null,
      totalAreaM2: null,
      workList: [],
      workItems: [],
      issue: "Unable to read the drawing photo.",
    }),
  );
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
  const response = await openai.chat.completions.create({
    model: process.env.ZTC_TEXT_MODEL || "gpt-5.1",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          `Classify a short worker WhatsApp transcript. Return only JSON with keys: isGibberish boolean, isFinish boolean, isAdditionalWork boolean, additionalWorkDescription string|null, workOption string|null, amountCompleted number|null, units string|null, issue string|null. Mark gibberish for random words, empty/noisy transcripts, or text with no understandable work meaning. Mark isFinish true if the worker says work is finished/done/completed. Mark isAdditionalWork true when the worker says "Papilddarbi", "papilddarbs", "saku papilddarbu", or a close Latvian derivative meaning additional work. For additionalWorkDescription, remove the additional-work keyword and keep the actual work description if present. For workOption, choose exactly one label from this allowed Darbi list if it clearly matches the worker's activity: ${JSON.stringify(effectiveWorkOptions)}. A drawing work prefixed with "TL" means timber frame / timberkarkass / karkass; when the worker says karkass, koka karkass, timber frame, or frame, match the most relevant TL option and return its exact label. Treat T and T1 prefixes as TL, and never return a T1 work option. If none clearly match, return null for workOption. For units, choose exactly one label from this allowed Mervieniba list if the worker mentions a completed quantity unit: ${JSON.stringify(unitOptions)}. If no allowed unit clearly matches, return null for units. Do not invent work options or unit values. If the worker says how much was completed, extract the numeric amount but only set units from the allowed list. Normalize obvious spoken numbers to digits, for example 'twelve panels' with allowed unit 'gab' -> amountCompleted 12, units 'gab', '8 square meters' with allowed unit 'm2' -> amountCompleted 8, units 'm2'. If no completed quantity is mentioned, use null for both amountCompleted and units.`,
      },
      { role: "user", content: normalized },
    ],
  });

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
}) {
  const { session, to, completedWork, completedText } = args;
  const now = new Date();
  const timeInvolved = calculateHours(session.Date, now);
  const amountCompleted =
    session.Amounts != null
      ? session.Amounts
      : completedWork?.amountCompleted != null
        ? completedWork.amountCompleted
        : null;
  const finalWorkerComment = completedText?.trim() || session.Comments || "";

  await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Date_Custom_2: now,
      TimeInvolved: timeInvolved,
      Amounts: amountCompleted ?? undefined,
      Units: "m2",
      Comments_Custom_1: null,
      Comments: finalWorkerComment,
    },
  });

  await sendMessage(to, `Darbs pabeigts un saglabats. Registretais laiks: ${timeInvolved ?? 0} stundas.`);
}

async function askForTlDiagonals(args: {
  session: OpenZtcSession;
  to: string | null;
  completedText?: string | null;
}) {
  const completedText = args.completedText?.trim() || "";

  await prisma.sitediaryrecords.update({
    where: { id: args.session.id },
    data: {
      Comments_Custom_1: `${DIAGONALS_PENDING_PREFIX} ${completedText}`,
      Units: "m2",
      Amounts: args.session.Amounts ?? undefined,
    },
  });

  await sendMessage(
    args.to,
    "TL/karkasa darbs ir pabeigts. Pirms noslegsanas ludzu izmeriet rama diagonales un atsutiet 2 skaitlus, piemeram: 5240 5238.",
  );
}

async function finishSessionOrAskTlDiagonals(args: {
  session: OpenZtcSession;
  to: string | null;
  completedWork?: WorkExtraction | null;
  completedText?: string | null;
}) {
  if (isTlWork(args.session.Works)) {
    await askForTlDiagonals({
      session: args.session,
      to: args.to,
      completedText: args.completedText,
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
    await sendMessage(args.to, "Neatradu 2 diagonalju skaitlus. Ludzu atsutiet abus merijumus, piemeram: 5240 5238.");
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

  await sendMessage(
    args.to,
    `Sanemu diagonalju merijumus: ${payload.diagonalA} un ${payload.diagonalB}. Vai pareizi? Atbildiet "ja" vai "ne".`,
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
    await sendMessage(args.to, "Labi, atsutiet pareizos 2 diagonalju merijumus velreiz.");
    return;
  }

  if (!isPositiveConfirmation(args.text)) {
    await sendMessage(args.to, `Ludzu apstipriniet merijumus ${payload.diagonalA} un ${payload.diagonalB} ar "ja" vai "ne".`);
    return;
  }

  await completeSession({
    session: args.session,
    to: args.to,
    completedText: buildDiagonalComment({
      session: args.session,
      completedText: payload.completedText,
      diagonalA: payload.diagonalA,
      diagonalB: payload.diagonalB,
    }),
  });
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

async function handleDrawingPhoto(args: {
  formData: FormData;
  idx: number;
  to: string | null;
  worker: ZtcWorker;
}) {
  const { formData, idx, to, worker } = args;

  const existing = await getOpenZtcSession(worker.id);
  if (existing?.Works) {
    await sendMessage(to, "Jums jau ir aktiva ZTC darba sesija. Ludzu pabeidziet to pirms jauna rasejuma sutisanas.");
    return;
  }

  const image = await uploadMediaImage(formData, idx);
  const extraction = await extractDrawingInfo(image.publicUrl);

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
    await sendMessage(
      to,
      "Ludzu atsutiet skaidru buvniecibas rasejuma foto, kur redzams projekta nosaukums, elementa numurs, kopplatiba m2 un darbu saraksts.",
    );
    return;
  }

  const drawingWorks = extraction.workList.join("; ");
  const drawingMetadata = JSON.stringify(buildDrawingMetadata(extraction));

  if (existing && !existing.Works) {
    await prisma.sitediaryrecords.update({
      where: { id: existing.id },
      data: {
        Date_Custom_1: new Date(),
        Location: extraction.projectName,
        Location_Custom_1: extraction.elementName,
        Works_Custom_1: drawingWorks,
        Comments_Custom_2: drawingMetadata,
        Comments: "ZTC rasejums sanemts. Gaidam balss zinu par darba saksanu.",
        Photos: [image.publicUrl],
      },
    });
  } else {
    await prisma.sitediaryrecords.create({
      data: {
        workerId: worker.id,
        siteId: ZTC_SITE_ID,
        organizationId: ZTC_ORGANIZATION_ID,
        Date_Custom_1: new Date(),
        Location: extraction.projectName,
        Location_Custom_1: extraction.elementName,
        Works_Custom_1: drawingWorks,
        Comments_Custom_2: drawingMetadata,
        Comments: "ZTC rasejums sanemts. Gaidam balss zinu par darba saksanu.",
        originalUserComment: `${workerFullName(worker)} : rasejuma foto`,
        Photos: [image.publicUrl],
      },
    });
  }

  await sendMessage(
    to,
    `Rasejums pienemts.\nProjekts: ${extraction.projectName}\nElementa numurs: ${extraction.elementName}\nPlatiba: ${extraction.totalAreaM2} m2\nDarbi:\n${formatExtractedWorksForMessage(extraction)}\n\nTagad atsutiet balss zinu ar darbu, ko sakat darit.`,
  );
}

async function createSessionFromLatestDrawing(worker: ZtcWorker) {
  const previous = await getLatestZtcDrawingContext(worker.id);
  if (!previous) return null;

  return prisma.sitediaryrecords.create({
    data: {
      workerId: worker.id,
      siteId: ZTC_SITE_ID,
      organizationId: ZTC_ORGANIZATION_ID,
      Date_Custom_1: new Date(),
      Location: previous.Location,
      Location_Custom_1: previous.Location_Custom_1,
      Works_Custom_1: previous.Works_Custom_1,
      Comments_Custom_2: previous.Comments_Custom_2,
      Comments: "ZTC rasejuma konteksts parnemts. Gaidam darba saksanas zinu.",
      originalUserComment: `${workerFullName(worker)} : atkartots darbs pie ta pasa rasejuma`,
      Photos: previous.Photos?.[0] ? [previous.Photos[0]] : [],
    },
  });
}

async function createAdditionalWorkSession(args: {
  worker: ZtcWorker;
  work: WorkExtraction;
  text: string;
}) {
  const { worker, work, text } = args;
  const { workOptions } = await getZtcDropdownOptions();
  const workOption = work.workOption ?? getFallbackOtherWorkOption(workOptions);
  const description = work.additionalWorkDescription?.trim() || text.trim();
  const now = new Date();

  return prisma.sitediaryrecords.create({
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
      Comments: [
        `Darbinieks: ${workerFullName(worker)}`,
        "Projekts: Papilddarbi",
        `Saktais darbs: ${workOption}`,
        work.amountCompleted != null ? `Apjoms: ${work.amountCompleted} m2` : null,
        description ? `Apraksts: ${description}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      originalUserComment: `${workerFullName(worker)} : ${text}`,
    },
  });
}

async function handleWorkText(args: {
  text: string;
  to: string | null;
  worker: ZtcWorker;
}) {
  const { text, to, worker } = args;
  const openSession = await getOpenZtcSession(worker.id);

  if (openSession?.Comments_Custom_1?.startsWith(DIAGONALS_PENDING_PREFIX)) {
    await handleDiagonalMeasurementText({ session: openSession, text, to });
    return;
  }

  if (openSession?.Comments_Custom_1?.startsWith(DIAGONALS_CONFIRM_PREFIX)) {
    await handleDiagonalConfirmationText({ session: openSession, text, to });
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
    await sendMessage(to, "Neizdevas saprast balss zinu. Ludzu meginiet velreiz.");
    return;
  }

  if (work.isAdditionalWork && !work.isFinish) {
    if (openSession?.Location === "Papilddarbi" && openSession.Works) {
      await sendMessage(to, "Papilddarbs jau ir aktiva sesija. Ludzu pabeidziet to pirms jauna papilddarba saksanas.");
      return;
    }

    await createAdditionalWorkSession({ worker, work, text });
    await sendMessage(
      to,
      `Papilddarbs sakts${work.workOption ? `: ${work.workOption}` : ""}. Kad darbs ir pabeigts, atsutiet foto un pasakiet, ka darbs ir pabeigts.`,
    );
    return;
  }

  const session = work.isFinish
    ? openSession
    : openSession ?? (await createSessionFromLatestDrawing(worker));

  if (!session) {
    await sendMessage(to, "Ludzu saciet ar skaidru buvniecibas rasejuma foto.");
    return;
  }

  const now = new Date();

  if (work.isFinish) {
    if (!session.Works) {
      await sendMessage(to, "Rasejums ir sanemts, bet vel nav darba saksanas zinas. Ludzu pasakiet, kadu darbu sakat.");
      return;
    }

    if ((session.Photos ?? []).length < 2) {
      await prisma.sitediaryrecords.update({
        where: { id: session.id },
        data: {
          Amounts: session.Amounts ?? undefined,
          Units: "m2",
          Comments_Custom_1: `${FINISH_PENDING_PREFIX} ${text}`,
        },
      });

      await sendMessage(to, "Pabeigsanas zina sanemta. Ludzu atsutiet pabeigta darba foto.");
      return;
    }

    await finishSessionOrAskTlDiagonals({
      session,
      to,
      completedWork: work,
      completedText: text,
    });
    return;
  }

  if (session.Works) {
    if (session.Comments_Custom_1?.startsWith(PHOTO_PENDING_FINISH_PREFIX)) {
      await sendMessage(to, "Pabeigta darba foto ir sanemts. Ludzu pasakiet, ka darbs ir pabeigts, lai es varu noslegt sesiju.");
      return;
    }

    await sendMessage(to, "Jums jau ir aktiva darba sesija. Ludzu vispirms atsutiet pabeigta darba foto un pasakiet, ka darbs ir pabeigts.");
    return;
  }

  if (!work.workOption) {
    await sendMessage(to, "Neatradu atbilstosu darbu saraksta. Ludzu pasakiet darbu velreiz.");
    return;
  }

  const amountM2 = getSessionWorkAmountM2(session, work.workOption);

  await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Date: now,
      Works: work.workOption,
      Units: "m2",
      Amounts: amountM2 ?? undefined,
      Comments: [
        `Darbinieks: ${workerFullName(worker)}`,
        `Projekts: ${session.Location ?? ""}`,
        `Elementa numurs: ${session.Location_Custom_1 ?? ""}`,
        `Saktais darbs: ${work.workOption}`,
        amountM2 != null ? `Apjoms: ${amountM2} m2` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      originalUserComment: `${workerFullName(worker)} : ${text}`,
    },
  });

  await sendMessage(
    to,
    `Sakts darbs: ${work.workOption}\nProjekts: ${session.Location}\nElementa numurs: ${session.Location_Custom_1}\nApjoms: ${amountM2 ?? 0} m2\nKad darbs ir pabeigts, atsutiet pabeigta darba foto un pasakiet, ka darbs ir pabeigts.`,
  );
}

async function handleFinishedPhoto(args: {
  formData: FormData;
  idx: number;
  to: string | null;
  worker: ZtcWorker;
  caption: string;
}) {
  const { formData, idx, to, worker, caption } = args;
  const session = await getOpenZtcSession(worker.id);

  if (!session?.Works) {
    await sendMessage(to, "Pirms pabeigta darba foto ludzu atsutiet rasejuma foto un balss zinu par darba saksanu.");
    return;
  }

  const image = await uploadMediaImage(formData, idx);
  const nextPhotos = [...(session.Photos ?? []), image.publicUrl];
  const shouldPreservePendingState =
    session.Comments_Custom_1?.startsWith(FINISH_PENDING_PREFIX) ||
    session.Comments_Custom_1?.startsWith(DIAGONALS_PENDING_PREFIX) ||
    session.Comments_Custom_1?.startsWith(DIAGONALS_CONFIRM_PREFIX);

  await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Photos: nextPhotos,
      Comments_Custom_1: shouldPreservePendingState
        ? session.Comments_Custom_1
        : PHOTO_PENDING_FINISH_PREFIX,
    },
  });
  await saveCompletedWorkPhoto({
    worker,
    publicUrl: image.publicUrl,
    session,
  });

  if (session.Comments_Custom_1?.startsWith(FINISH_PENDING_PREFIX)) {
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
    await sendMessage(to, "Foto sanemts. Ludzu atsutiet 2 rama diagonalju merijumus.");
    return;
  }

  if (session.Comments_Custom_1?.startsWith(DIAGONALS_CONFIRM_PREFIX)) {
    const rawPayload = readMarkerPayload(session.Comments_Custom_1, DIAGONALS_CONFIRM_PREFIX);
    const payload = parseJsonObject<{ diagonalA: number; diagonalB: number }>(rawPayload, {
      diagonalA: 0,
      diagonalB: 0,
    });
    await sendMessage(to, `Foto sanemts. Ludzu apstipriniet diagonalju merijumus ${payload.diagonalA} un ${payload.diagonalB} ar "ja" vai "ne".`);
    return;
  }

  if (caption.trim()) {
    await handleWorkText({ text: caption, to, worker });
    return;
  }

  await sendMessage(to, "Pabeigta darba foto sanemts. Ludzu atsutiet balss zinu vai tekstu, ka darbs ir pabeigts.");
}

export async function handleZtcWorkerRoute(args: {
  formData: FormData;
  worker: ZtcWorker;
}) {
  const { formData, worker } = args;
  const from = getString(formData, "From");
  const body = (getString(formData, "Body") || "").trim();
  const numMedia = Number(getString(formData, "NumMedia") || "0") || 0;
  const imageIdx = findFirstMediaIndex(formData, numMedia, "image/");
  const audioIdx = findFirstMediaIndex(formData, numMedia, "audio/");

  try {
    if (imageIdx >= 0) {
      const openSession = await getOpenZtcSession(worker.id);
      if (openSession?.Works) {
        await handleFinishedPhoto({ formData, idx: imageIdx, to: from, worker, caption: body });
      } else {
        await handleDrawingPhoto({ formData, idx: imageIdx, to: from, worker });
      }
      return;
    }

    if (audioIdx >= 0) {
      const transcript = await transcribeAudio(formData, audioIdx);
      await handleWorkText({ text: transcript, to: from, worker });
      return;
    }

    if (body) {
      await handleWorkText({ text: body, to: from, worker });
      return;
    }

    await sendMessage(from, "Ludzu atsutiet rasejuma foto, balss zinu vai pabeigta darba foto.");
  } catch (error) {
    console.error("[ZTC workflow] failed", error);
    await sendMessage(from, "Atvainojiet, ZTC plusma nevareja apstradat so zinu. Ludzu meginiet velreiz.");
  }
}
