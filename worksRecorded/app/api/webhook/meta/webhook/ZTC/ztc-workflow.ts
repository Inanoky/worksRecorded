import { UTApi } from "uploadthing/server";
import OpenAI, { toFile } from "openai";
import { prisma } from "@/lib/utils/db";
import {
  fetchTwilioMediaAsBuffer,
  getString,
} from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage } from "@/lib/utils/whatsapp-helpers/shared/twillio";

export const ZTC_ORGANIZATION_ID = "21511437-f6ab-402b-aa2d-613110eb61da";
const ZTC_SITE_ID = "4c26c435-dd19-49d7-ad60-981eb1eeaeff";

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
  qualityOk: boolean;
  projectName: string | null;
  elementName: string | null;
  issue: string | null;
};

type WorkExtraction = {
  isGibberish: boolean;
  isFinish: boolean;
  workDescription: string | null;
  issue: string | null;
};

const utapi = new UTApi();

function workerFullName(worker: ZtcWorker) {
  return [worker.name, worker.surname].filter(Boolean).join(" ").trim() || "Worker";
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
          "You validate photos sent by factory workers. Return only JSON with keys: isConstructionDrawing boolean, hasReadableProjectName boolean, hasReadableElementName boolean, qualityOk boolean, projectName string|null, elementName string|null, issue string|null. Accept only construction/shop/precast/timber element drawings. Reject ordinary site photos, selfies, documents without drawing context, and unreadable/blurry photos. Extract the project name and element name exactly as visible when possible.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Check this WhatsApp photo. Is it a readable construction drawing with both project name and element name?",
          },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
  });

  return parseJsonObject<DrawingExtraction>(response.choices[0]?.message?.content, {
    isConstructionDrawing: false,
    hasReadableProjectName: false,
    hasReadableElementName: false,
    qualityOk: false,
    projectName: null,
    elementName: null,
    issue: "Unable to read the drawing photo.",
  });
}

async function extractWorkInfo(text: string): Promise<WorkExtraction> {
  const normalized = text.trim();
  if (!normalized) {
    return {
      isGibberish: true,
      isFinish: false,
      workDescription: null,
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
          "Classify a short worker WhatsApp transcript. Return only JSON with keys: isGibberish boolean, isFinish boolean, workDescription string|null, issue string|null. Mark gibberish for random words, empty/noisy transcripts, or text with no understandable work meaning. Mark isFinish true if the worker says work is finished/done/completed. Otherwise extract the work activity being started, e.g. 'timber frame assembly'. Keep it concise.",
      },
      { role: "user", content: normalized },
    ],
  });

  return parseJsonObject<WorkExtraction>(response.choices[0]?.message?.content, {
    isGibberish: true,
    isFinish: false,
    workDescription: null,
    issue: "Could not understand the work message.",
  });
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

function calculateHours(start: Date | null | undefined, end: Date) {
  if (!start) return undefined;
  const hours = (end.getTime() - start.getTime()) / 3_600_000;
  if (!Number.isFinite(hours) || hours < 0) return undefined;
  return Number(hours.toFixed(2));
}

async function completeSession(args: {
  session: NonNullable<Awaited<ReturnType<typeof getOpenZtcSession>>>;
  worker: ZtcWorker;
  to: string | null;
}) {
  const { session, worker, to } = args;
  const now = new Date();
  const timeInvolved = calculateHours(session.Date, now);

  await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Date_Custom_2: now,
      TimeInvolved: timeInvolved,
      Comments_Custom_1: null,
      Comments: [
        `Worker: ${workerFullName(worker)}`,
        `Project: ${session.Location ?? ""}`,
        `Element: ${session.Location_Custom_1 ?? ""}`,
        `Work finished: ${session.Works}`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  });

  await sendMessage(to, `Work finished and saved. Time recorded: ${timeInvolved ?? 0} hours.`);
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
    await sendMessage(
      to,
      "You already have an active ZTC work session. Please finish it before starting a new drawing.",
    );
    return;
  }

  const image = await uploadMediaImage(formData, idx);
  const extraction = await extractDrawingInfo(image.publicUrl);

  if (
    !extraction.isConstructionDrawing ||
    !extraction.qualityOk ||
    !extraction.hasReadableProjectName ||
    !extraction.hasReadableElementName ||
    !extraction.projectName ||
    !extraction.elementName
  ) {
    await sendMessage(
      to,
      `Please send a clear photo of the construction drawing where project name and element name are readable. ${
        extraction.issue || ""
      }`.trim(),
    );
    return;
  }

  if (existing && !existing.Works) {
    await prisma.sitediaryrecords.update({
      where: { id: existing.id },
      data: {
        Date_Custom_1: new Date(),
        Location: extraction.projectName,
        Location_Custom_1: extraction.elementName,
        Comments: "ZTC drawing received. Waiting for work start voice message.",
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
        Comments: "ZTC drawing received. Waiting for work start voice message.",
        originalUserComment: `${workerFullName(worker)} : drawing photo`,
        Photos: [image.publicUrl],
      },
    });
  }

  await sendMessage(
    to,
    `Drawing accepted.\nProject: ${extraction.projectName}\nElement: ${extraction.elementName}\nNow send a voice message with the work you are starting.`,
  );
}

async function handleWorkText(args: {
  text: string;
  to: string | null;
  worker: ZtcWorker;
}) {
  const { text, to, worker } = args;
  const session = await getOpenZtcSession(worker.id);

  if (!session) {
    await sendMessage(to, "Please start by sending a clear photo of the construction drawing.");
    return;
  }

  const work = await extractWorkInfo(text);
  if (work.isGibberish) {
    await sendMessage(to, `I could not understand that voice message. ${work.issue || "Please try again."}`.trim());
    return;
  }

  const now = new Date();

  if (work.isFinish) {
    if (!session.Works) {
      await sendMessage(to, "I have the drawing, but not the work you started yet. Please send the starting work first.");
      return;
    }

    if ((session.Photos ?? []).length < 2) {
      await prisma.sitediaryrecords.update({
        where: { id: session.id },
        data: {
          Comments_Custom_1: `__ZTC_FINISH_PENDING__ ${text}`,
        },
      });

      await sendMessage(to, "Finish message received. Please send a photo of the completed work.");
      return;
    }

    await completeSession({ session, worker, to });
    return;
  }

  if (!work.workDescription) {
    await sendMessage(to, "Please say which work you are starting.");
    return;
  }

  await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: {
      Date: now,
      Works: work.workDescription,
      Comments: [
        `Worker: ${workerFullName(worker)}`,
        `Project: ${session.Location ?? ""}`,
        `Element: ${session.Location_Custom_1 ?? ""}`,
        `Started work: ${work.workDescription}`,
      ]
        .filter(Boolean)
        .join("\n"),
      originalUserComment: `${workerFullName(worker)} : ${text}`,
    },
  });

  await sendMessage(
    to,
    `Started: ${work.workDescription}\nProject: ${session.Location}\nElement: ${session.Location_Custom_1}\nWhen finished, send a completed-work photo and say the work is finished.`,
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
    await sendMessage(to, "Please send the drawing photo and starting work voice message before completion photos.");
    return;
  }

  const image = await uploadMediaImage(formData, idx);
  const nextPhotos = [...(session.Photos ?? []), image.publicUrl];

  await prisma.sitediaryrecords.update({
    where: { id: session.id },
    data: { Photos: nextPhotos },
  });

  if (session.Comments_Custom_1?.startsWith("__ZTC_FINISH_PENDING__")) {
    await completeSession({
      session: {
        ...session,
        Photos: nextPhotos,
      },
      worker,
      to,
    });
    return;
  }

  if (caption.trim()) {
    await handleWorkText({ text: caption, to, worker });
    return;
  }

  await sendMessage(to, "Completion photo received. Please send a voice message saying the work is finished.");
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

    await sendMessage(from, "Please send a drawing photo, a voice message, or a completed-work photo.");
  } catch (error) {
    console.error("[ZTC workflow] failed", error);
    await sendMessage(from, "Sorry, ZTC workflow could not process this message. Please try again.");
  }
}
