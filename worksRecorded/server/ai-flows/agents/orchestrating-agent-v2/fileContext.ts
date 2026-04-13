"use server";

import OpenAI from "openai";
import { requireUser } from "@/lib/utils/requireUser";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export type NativeAttachmentInput = {
  name: string;
  mimeType: string;
  dataUrl: string;
};

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_") || `attachment-${Date.now()}.bin`;
}

function dataUrlToFile(dataUrl: string, name: string, mimeType?: string): File {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);

  if (!match) {
    throw new Error("Invalid data URL format");
  }

  const [, detectedMime, base64Flag, rawPayload] = match;
  const finalMime = mimeType || detectedMime || "application/octet-stream";

  const bytes = base64Flag
    ? Buffer.from(rawPayload, "base64")
    : Buffer.from(decodeURIComponent(rawPayload), "utf8");

  return new File([bytes], safeFileName(name), { type: finalMime });
}

export async function buildNativeFileContext(
  question: string,
  attachments: NativeAttachmentInput[]
) {
  await requireUser();

  const inputFiles = attachments
    .filter((file) => typeof file.dataUrl === "string" && file.dataUrl.startsWith("data:"))
    .slice(0, 5);

  if (!inputFiles.length) {
    return "";
  }

  const fileIds: string[] = [];

  for (const file of inputFiles) {
    const openaiFile = dataUrlToFile(file.dataUrl, file.name, file.mimeType);
    const uploaded = await client.files.create({
      file: openaiFile,
      purpose: "user_data",
    });
    fileIds.push(uploaded.id);
  }

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "Extract only the information that is relevant for answering the user's question. " +
              "If the file is unreadable, say so briefly. Keep response concise and factual.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `User question: ${question}`,
          },
          ...fileIds.map((id) => ({
            type: "input_file" as const,
            file_id: id,
          })),
        ],
      },
    ],
  });

  return response.output_text ?? "";
}
