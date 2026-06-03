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
  workList: string[];
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

const utapi = new UTApi();

function getDropdownLabels(config: ZtcConfigMap, fieldKey: string) {
  const options = config?.[fieldKey]?.DropDownOptions;
  if (!options || typeof options !== "object") return [];
  return Object.values(options)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

async function getZtcDropdownOptions() {
  const config = ((await getConfig(ZTC_SITE_ID)) ??
    ztcSiteDiaryRecordsMap) as ZtcConfigMap;

  return {
    workOptions: getDropdownLabels(config, "Works"),
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

function normalizeDrawingExtraction(value: DrawingExtraction): DrawingExtraction {
  return {
    ...value,
    workList: Array.isArray(value.workList)
      ? value.workList.map((work) => String(work).trim()).filter(Boolean)
      : [],
  };
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
          "You validate photos sent by factory workers. Return only JSON with keys: isConstructionDrawing boolean, hasReadableProjectName boolean, hasReadableElementName boolean, hasReadableWorkList boolean, qualityOk boolean, projectName string|null, elementName string|null, workList string[], issue string|null. Accept only construction/shop/precast/timber element drawings. Reject ordinary site photos, selfies, documents without drawing context, drawings without a readable project name, drawings without a readable element name, drawings without a readable list/table/notes of work operations, and unreadable/blurry photos. Extract the project name, element name, and visible work operations exactly as visible when possible.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Check this WhatsApp photo. Is it a readable construction drawing with project name, element name, and a readable work/operation list?",
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
      workList: [],
      issue: "Unable to read the drawing photo.",
    }),
  );
}

async function extractWorkInfo(text: string): Promise<WorkExtraction> {
  const normalized = text.trim();
  const { workOptions, unitOptions } = await getZtcDropdownOptions();

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
          `Classify a short worker WhatsApp transcript. Return only JSON with keys: isGibberish boolean, isFinish boolean, isAdditionalWork boolean, additionalWorkDescription string|null, workOption string|null, amountCompleted number|null, units string|null, issue string|null. Mark gibberish for random words, empty/noisy transcripts, or text with no understandable work meaning. Mark isFinish true if the worker says work is finished/done/completed. Mark isAdditionalWork true when the worker says "Papilddarbi", "papilddarbs", "saku papilddarbu", or a close Latvian derivative meaning additional work. For additionalWorkDescription, remove the additional-work keyword and keep the actual work description if present. For workOption, choose exactly one label from this allowed Darbi list if it clearly matches the worker's activity: ${JSON.stringify(workOptions)}. If none clearly match, return null for workOption. For units, choose exactly one label from this allowed Mervieniba list if the worker mentions a completed quantity unit: ${JSON.stringify(unitOptions)}. If no allowed unit clearly matches, return null for units. Do not invent work options or unit values. If the worker says how much was completed, extract the numeric amount but only set units from the allowed list. Normalize obvious spoken numbers to digits, for example 'twelve panels' with allowed unit 'gab' -> amountCompleted 12, units 'gab', '8 square meters' with allowed unit 'm2' -> amountCompleted 8, units 'm2'. If no completed quantity is mentioned, use null for both amountCompleted and units.`,
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
    workOption: normalizeAllowedOption(extracted.workOption, workOptions),
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
    completedWork?.amountCompleted != null
      ? completedWork.amountCompleted
      : session.Amounts;
  const units = completedWork?.units?.trim() || session.Units || null;
  const finalWorkerComment = completedText?.trim() || session.Comments || "";

  await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Date_Custom_2: now,
      TimeInvolved: timeInvolved,
      Amounts: amountCompleted ?? undefined,
      Units: units ?? undefined,
      Comments_Custom_1: null,
      Comments: finalWorkerComment,
    },
  });

  await sendMessage(to, `Darbs pabeigts un saglabats. Registretais laiks: ${timeInvolved ?? 0} stundas.`);
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
    extraction.workList.length === 0
  ) {
    await sendMessage(
      to,
      "Ludzu atsutiet skaidru buvniecibas rasejuma foto, kur redzams projekta nosaukums, elementa numurs un darbu saraksts.",
    );
    return;
  }

  const drawingWorks = extraction.workList.join("; ");

  if (existing && !existing.Works) {
    await prisma.sitediaryrecords.update({
      where: { id: existing.id },
      data: {
        Date_Custom_1: new Date(),
        Location: extraction.projectName,
        Location_Custom_1: extraction.elementName,
        Works_Custom_1: drawingWorks,
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
        Comments: "ZTC rasejums sanemts. Gaidam balss zinu par darba saksanu.",
        originalUserComment: `${workerFullName(worker)} : rasejuma foto`,
        Photos: [image.publicUrl],
      },
    });
  }

  await sendMessage(
    to,
    `Rasejums pienemts.\nProjekts: ${extraction.projectName}\nElementa numurs: ${extraction.elementName}\nTagad atsutiet balss zinu ar darbu, ko sakat darit.`,
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
      Comments: [
        `Darbinieks: ${workerFullName(worker)}`,
        "Projekts: Papilddarbi",
        `Saktais darbs: ${workOption}`,
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
  const work = await extractWorkInfo(text);

  if (work.isGibberish) {
    await sendMessage(to, "Neizdevas saprast balss zinu. Ludzu meginiet velreiz.");
    return;
  }

  const openSession = await getOpenZtcSession(worker.id);

  if (work.isAdditionalWork && !work.isFinish) {
    if (openSession?.Works) {
      await sendMessage(to, "Jums jau ir aktiva darba sesija. Ludzu pabeidziet to pirms papilddarba saksanas.");
      return;
    }

    await createAdditionalWorkSession({ worker, work, text });
    await sendMessage(
      to,
      `Papilddarbs sakts${work.workOption ? `: ${work.workOption}` : ""}. Kad darbs ir pabeigts, atsutiet foto un pasakiet, ka darbs ir pabeigts.`,
    );
    return;
  }

  const session = openSession ?? (!work.isFinish ? await createSessionFromLatestDrawing(worker) : null);

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
          Amounts: work.amountCompleted ?? undefined,
          Units: work.units?.trim() || undefined,
          Comments_Custom_1: `${FINISH_PENDING_PREFIX} ${text}`,
        },
      });

      await sendMessage(to, "Pabeigsanas zina sanemta. Ludzu atsutiet pabeigta darba foto.");
      return;
    }

    await completeSession({
      session,
      to,
      completedWork: work,
      completedText: text,
    });
    return;
  }

  if (!work.workOption) {
    await sendMessage(to, "Neatradu atbilstosu darbu saraksta. Ludzu pasakiet darbu velreiz.");
    return;
  }

  await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Date: now,
      Works: work.workOption,
      Comments: [
        `Darbinieks: ${workerFullName(worker)}`,
        `Projekts: ${session.Location ?? ""}`,
        `Elementa numurs: ${session.Location_Custom_1 ?? ""}`,
        `Saktais darbs: ${work.workOption}`,
      ]
        .filter(Boolean)
        .join("\n"),
      originalUserComment: `${workerFullName(worker)} : ${text}`,
    },
  });

  await sendMessage(
    to,
    `Sakts darbs: ${work.workOption}\nProjekts: ${session.Location}\nElementa numurs: ${session.Location_Custom_1}\nKad darbs ir pabeigts, atsutiet pabeigta darba foto un pasakiet, ka darbs ir pabeigts.`,
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

  await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: { Photos: nextPhotos },
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

    await completeSession({
      session: {
        ...session,
        Photos: nextPhotos,
      },
      to,
      completedText,
    });
    return;
  }

  if (caption.trim()) {
    await handleWorkText({ text: caption, to, worker });
    return;
  }

  await sendMessage(to, "Pabeigta darba foto sanemts. Ludzu atsutiet balss zinu, ka darbs ir pabeigts.");
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
