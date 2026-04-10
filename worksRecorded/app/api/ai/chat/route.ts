import OrchestratingAgentV2 from "@/server/ai-flows/agents/orchestrating-agent-v2/agent";

const MAX_CONTEXT_MESSAGES = 12;
const MAX_CONTEXT_CHARS = 6000;
const STREAM_CHUNK_SIZE = 24;

function buildContext(messages: any[]) {
  const recent = messages.slice(-MAX_CONTEXT_MESSAGES);
  const text = recent
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content ?? ""}`)
    .join("\n");
  return text.slice(-MAX_CONTEXT_CHARS);
}

function toStream(text: string) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for (let i = 0; i < text.length; i += STREAM_CHUNK_SIZE) {
        controller.enqueue(encoder.encode(text.slice(i, i + STREAM_CHUNK_SIZE)));
        await new Promise((r) => setTimeout(r, 12));
      }
      controller.close();
    },
  });
}

export async function POST(req: Request) {
  try {
    const { messages = [], siteId } = await req.json();
    const lastUser = [...messages].reverse().find((m: any) => m.role === "user");

    if (!lastUser?.content) {
      return new Response("", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const context = buildContext(messages.slice(0, -1));
    const prompt = context
      ? `Recent conversation context:\n${context}\n\nCurrent user message:\n${lastUser.content}`
      : String(lastUser.content);

    const aiResult = await OrchestratingAgentV2(prompt, siteId);
    const text = typeof aiResult === "string" ? aiResult : JSON.stringify(aiResult ?? "");

    return new Response(toStream(text), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response("Something went wrong while processing chat.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
