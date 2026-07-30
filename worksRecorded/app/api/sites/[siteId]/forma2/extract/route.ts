import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { extractForma2WorkbookWithAi } from "@/flows/default-construction/backend/forma2-ai-extractor";
import type { Forma2ExtractionStreamEvent } from "@/flows/default-construction/lib/forma2-extraction-progress";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { orgCheck } from "@/server/actions/shared-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FORMA2_FILE_BYTES = 25 * 1024 * 1024;

function errorResponse(message: string, status: number) {
	return NextResponse.json({ error: message }, { status });
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ siteId: string }> },
) {
	const { siteId } = await params;
	try {
		const { getUser } = getKindeServerSession();
		const user = await getUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const site = await orgCheck(user.id, siteId);
		if (!site) return errorResponse("Not found", 404);
		const flowModuleKey = await resolveFlowModuleKeyForRuntime({
			organizationId: site.organizationId ?? null,
			siteId,
		});
		if (flowModuleKey !== FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION) {
			return errorResponse(
				"Forma 2 analytics is available only for Default Construction",
				403,
			);
		}

		const formData = await request.formData();
		const file = formData.get("file");
		if (!(file instanceof File)) {
			return errorResponse("Forma 2 file is required", 400);
		}
		if (!/\.xlsx?$/i.test(file.name)) {
			return errorResponse("Only XLS and XLSX files are supported", 400);
		}
		if (file.size <= 0 || file.size > MAX_FORMA2_FILE_BYTES) {
			return errorResponse("Forma 2 file must be smaller than 25 MB", 400);
		}

		const fileName = file.name.slice(0, 240);
		const buffer = await file.arrayBuffer();
		const encoder = new TextEncoder();
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				let closed = false;
				const send = (event: Forma2ExtractionStreamEvent) => {
					if (closed) return;
					try {
						controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
					} catch {
						closed = true;
					}
				};
				void extractForma2WorkbookWithAi({
					fileName,
					buffer,
					onProgress: (progress) => send({ type: "progress", ...progress }),
				})
					.then((sheets) => {
						if (!sheets.length) {
							send({
								type: "error",
								error:
									"No detailed Forma 2 positions were found in this workbook",
							});
							return;
						}
						send({ type: "complete", sheets });
					})
					.catch((error) => {
						console.error("[api/sites/forma2/extract] failed", {
							siteId,
							error: error instanceof Error ? error.message : String(error),
						});
						send({
							type: "error",
							error: "Could not extract Forma 2 positions",
						});
					})
					.finally(() => {
						if (closed) return;
						closed = true;
						controller.close();
					});
			},
		});
		return new NextResponse(stream, {
			headers: {
				"Cache-Control": "no-cache, no-transform",
				"Content-Type": "application/x-ndjson; charset=utf-8",
				"X-Accel-Buffering": "no",
			},
		});
	} catch (error) {
		console.error("[api/sites/forma2/extract] failed", {
			siteId,
			error: error instanceof Error ? error.message : String(error),
		});
		return errorResponse("Could not extract Forma 2 positions", 500);
	}
}
