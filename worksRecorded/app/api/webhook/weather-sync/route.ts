import { NextResponse } from "next/server";
import { syncRecentActiveDaysWeather } from "@/server/actions/site-diary-actions";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncRecentActiveDaysWeather();
  return NextResponse.json(result);
}
