import { NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import { createPerfTrace } from "@/lib/observability/perf";
import OrchestratingAgentV2 from "@/server/ai-flows/agents/orchestrating-agent-v2/agent";
import { buildNativeFileContext } from "@/server/ai-flows/agents/orchestrating-agent-v2/fileContext";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ATTACHMENTS_FOR_NATIVE_CONTEXT = 5;
const MAX_TEXT_EXTRACT = 5000;

type AttachmentInput = {
  name: string;
  mimeType: string;
  size: number;
  textContent?: string;
  dataUrl?: string;
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function composePrompt(text: string, attachments: AttachmentInput[], nativeFileContext = "") {
  if (!attachments.length) return text;

  const attachmentContext = attachments
    .map((file, index) => {
      const base = `#${index + 1} ${file.name} (${file.mimeType || "unknown"}, ${formatBytes(file.size)})`;
      const extracted = file.textContent?.trim();
      if (!extracted) return base;
      return `${base}\nExtracted content:\n${extracted.slice(0, MAX_TEXT_EXTRACT)}`;
    })
    .join("\n\n");

  const nativeContextBlock = nativeFileContext.trim()
    ? `\n\nNative OpenAI file context:\n${nativeFileContext.trim()}`
    : "";

  return `${text}\n\nAttached files context:\n${attachmentContext}${nativeContextBlock}\n\nUse the attached file context in your answer when relevant.`;
}

export async function POST(request: Request) {
  const trace = createPerfTrace({
    route: "/api/ai/chat",
    category: "ai",
    requestId: request.headers.get("x-vercel-id") ?? undefined,
  });
  let userId: string | null = null;
  let siteId: string | null = null;
  let attachmentCount = 0;
  let nativeAttachmentCount = 0;
  let promptChars = 0;

  try {
    const { getUser } = getKindeServerSession();
    const user = await trace.measure("auth", () => getUser());

    if (!user) {
      trace.end({
        status: 401,
        extra: { userId, siteId, attachmentCount, nativeAttachmentCount, promptChars },
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    const body = (await trace.measure("parseBody", () => request.json())) as {
      siteId?: string;
      message?: string;
      attachments?: AttachmentInput[];
    };
    siteId = body.siteId ?? null;

    const message = body.message?.trim();
    if (!message) {
      trace.end({
        status: 400,
        extra: { userId, siteId, attachmentCount, nativeAttachmentCount, promptChars },
      });
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    attachmentCount = attachments.length;
    let nativeFileContext = "";

    const nativeAttachments = attachments
      .filter((item) => typeof item.dataUrl === "string" && item.dataUrl.startsWith("data:"))
      .slice(0, MAX_ATTACHMENTS_FOR_NATIVE_CONTEXT)
      .map((item) => ({
        name: item.name,
        mimeType: item.mimeType,
        dataUrl: item.dataUrl as string,
      }));
    nativeAttachmentCount = nativeAttachments.length;

    nativeFileContext = await trace.measure("nativeFileContext", async () => {
      if (nativeAttachments.length === 0) return "";
      return buildNativeFileContext(message, nativeAttachments);
    });

    const prompt = await trace.measure("promptBuild", () =>
      composePrompt(message, attachments, nativeFileContext),
    );
    promptChars = prompt.length;
    const result = await trace.measure("ai", () => OrchestratingAgentV2(prompt, body.siteId));

    trace.end({
      status: 200,
      extra: { userId, siteId, attachmentCount, nativeAttachmentCount, promptChars },
    });

    return NextResponse.json({
      aiComment: String((result as any) ?? ""),
      acceptedResults: (result as any)?.acceptedResults ?? "",
    });
  } catch (error) {
    trace.fail(error, {
      status: 500,
      extra: { userId, siteId, attachmentCount, nativeAttachmentCount, promptChars },
    });
    console.error("[api/ai/chat] failed", error);
    return NextResponse.json(
      { error: "Something went wrong while contacting AI. Please try again." },
      { status: 500 },
    );
  }
}
