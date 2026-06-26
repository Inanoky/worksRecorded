import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isLocalAiEvalUiEnabledForHost } from "@/lib/ai-evals/local-gate";
import { loadEvalReports } from "@/lib/ai-evals/report-loader";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isLocalAiEvalUiEnabledForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const reports = await loadEvalReports();
  return NextResponse.json({ reports });
}
