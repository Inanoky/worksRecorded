import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { z } from "zod";
import { importWarehouseInvoice } from "@/flows/default-construction/backend/warehouse-import-actions";

export const maxDuration = 120;

const inputSchema = z.object({ receipt: z.string().min(1).max(12000) });

export async function POST(request: Request) {
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(request.url).origin) {
		return Response.json({ ok: false, error: "access" }, { status: 403 });
	}
	const { getUser } = getKindeServerSession();
	if (!(await getUser()))
		return Response.json({ ok: false, error: "access" }, { status: 401 });
	const input = inputSchema.safeParse(await request.json().catch(() => null));
	if (!input.success) {
		return Response.json(
			{ ok: false, error: "invalid_input" },
			{ status: 400 },
		);
	}
	const result = await importWarehouseInvoice(input.data.receipt);
	const status = result.ok
		? 200
		: result.error === "access"
			? 403
			: result.error === "empty"
				? 422
				: 500;
	return Response.json(result, { status });
}
