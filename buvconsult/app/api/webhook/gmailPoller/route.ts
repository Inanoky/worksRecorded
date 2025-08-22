// app/api/webhook/gmailPoller/route.ts


import type { NextRequest } from "next/server";
import { runPoller } from "@/poller/pollGmail";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const summary = await runPoller();
    return Response.json({ ok: true, summary });
  } catch (e: any) {
    console.error("gmailPoller error:", e);
    return new Response(e?.message ?? "failed", { status: 500 });
  }
}
