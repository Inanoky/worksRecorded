import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { loadFimaDiaryPage } from "@/flows/default-construction/backend/fima-diary-page";
import {
	fimaDiaryFilterSchema,
	readFimaDiaryFilters,
} from "@/lib/fima/diary-filters";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { getOrganizationIdByUserId } from "@/server/actions/shared-actions";

export const dynamic = "force-dynamic";

const querySchema = z.object({
	...fimaDiaryFilterSchema.shape,
	project: z.string().uuid().optional(),
	page: z.coerce.number().int().min(1).max(1_000_000).default(1),
	q: z.string().max(500).optional(),
	from: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	to: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	view: z.enum(["project", "all"]).default("all"),
	work: z.string().max(2000).optional(),
	floor: z.string().max(2000).optional(),
});
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
	const { getUser } = getKindeServerSession();
	const user = await getUser();
	if (!user)
		return NextResponse.json(
			{ error: "Unauthorized" },
			{ status: 401, headers },
		);
	const parsed = querySchema.safeParse(
		Object.fromEntries(new URL(request.url).searchParams),
	);
	if (
		!parsed.success ||
		(parsed.data.view === "project" && !parsed.data.project)
	) {
		return NextResponse.json(
			{ error: "Invalid query" },
			{ status: 400, headers },
		);
	}
	try {
		const organizationId = await getOrganizationIdByUserId(user.id);
		if (
			!organizationId ||
			(await resolveFlowModuleKeyForRuntime({ organizationId })) !==
				FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION
		) {
			return NextResponse.json(
				{ error: "Not found" },
				{ status: 404, headers },
			);
		}
		const query = parsed.data;
		const data = await loadFimaDiaryPage(organizationId, {
			...readFimaDiaryFilters(query),
			page: query.page,
			projectId: query.project,
			keyword: query.q,
			dateFrom: query.from,
			dateTo: query.to,
			projectView: query.view === "project",
			workFilter: query.work,
			floorFilter: query.floor,
		});
		return NextResponse.json(data, { headers });
	} catch (error) {
		console.error("[fima-diary-page] Failed to load page", error);
		return NextResponse.json(
			{ error: "Failed to load records" },
			{ status: 500, headers },
		);
	}
}
