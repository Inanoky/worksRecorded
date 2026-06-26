import { NextResponse } from "next/server";

import { isAiEvalUiEnabled } from "@/lib/ai-evals/local-gate";
import { loadEvalReports } from "@/lib/ai-evals/report-loader";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAiEvalUiEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const reports = await loadEvalReports();
  return NextResponse.json({ reports });
}
