import { NextResponse } from "next/server";
import { requireUser } from "@/lib/utils/requireUser";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { siteId } = await req.json().catch(() => ({ siteId: "default" }));

    const apiKey = process.env.OPENAI_API_KEY;
    const workflowId = process.env.OPENAI_CHATKIT_WORKFLOW_ID;

    if (!apiKey || !workflowId) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY or OPENAI_CHATKIT_WORKFLOW_ID" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1",
      },
      body: JSON.stringify({
        workflow: { id: workflowId },
        user: `${user.id}:${siteId ?? "default"}`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Failed to create ChatKit session" },
        { status: response.status }
      );
    }

    return NextResponse.json({ client_secret: data.client_secret });
  } catch {
    return NextResponse.json({ error: "Unable to create ChatKit session" }, { status: 500 });
  }
}
