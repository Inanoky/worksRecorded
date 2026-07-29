import { NextResponse } from "next/server";
import { runDefaultConstructionForma2AutoAssignment } from "@/flows/default-construction/backend/forma2-analytics-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
	_request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	const { siteId } = await params;
	try {
		const result = await runDefaultConstructionForma2AutoAssignment(siteId);
		return NextResponse.json(result);
	} catch (error) {
		console.error("[api/sites/forma2/auto-assign] failed", {
			siteId,
			error: error instanceof Error ? error.message : String(error),
		});
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Could not assign Forma 2 records",
			},
			{ status: 500 },
		);
	}
}
