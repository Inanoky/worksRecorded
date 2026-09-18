"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

export async function deleteTgemProject(siteId: string) {
	const user = await requireUser();
	const parsed = z.string().trim().min(1).safeParse(siteId);
	if (!parsed.success) return { ok: false, error: "invalid_input" } as const;
	const dbUser = await prisma.user.findFirst({
		where: { id: user.id, status: "active" },
		select: { organizationId: true },
	});
	if (!dbUser?.organizationId)
		return { ok: false, error: "access_denied" } as const;
	const organizationId = dbUser.organizationId;
	const flow = await resolveFlowModuleKeyForRuntime({ organizationId });
	if (flow !== FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL) {
		return { ok: false, error: "access_denied" } as const;
	}
	const deleted = await prisma.site.deleteMany({
		where: { id: parsed.data, organizationId },
	});
	if (deleted.count !== 1)
		return { ok: false, error: "access_denied" } as const;
	revalidatePath("/dashboard/sites");
	revalidatePath("/dashboard/invoices");
	revalidatePath("/dashboard/invoices/settings");
	return { ok: true } as const;
}
