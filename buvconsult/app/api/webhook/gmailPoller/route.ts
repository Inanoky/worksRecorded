import { NextRequest, NextResponse } from "next/server";
import { runPoller } from "@/poller/pollGmail";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-vercel-cron") !== "1") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    const summary = await runPoller();
    return NextResponse.json({ ok: true, summary }, { status: 200 });
  } catch (e: any) {
    console.error("gmailPoller error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "failed" }, { status: 500 });
  }
}
