// app/api/webhook/gmailPoller/route.ts


import type { NextRequest } from "next/server";
import { runPoller } from "@/app/api/poller/pollGmail";

export async function GET(request: NextRequest) {


  console.log("📩 Incoming cron request:");
  console.log("Headers:", Object.fromEntries(request.headers.entries()));
  console.log("URL:", request.url);

  
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
