"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { canAccessFlowConfigAdmin } from "@/lib/production-flow/config";
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
	const requestHeaders = await headers();
	const platformAdmin = canAccessFlowConfigAdmin(
		user.id,
		requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
	);
	const site = await prisma.site.findUnique({
		where: { id: parsed.data },
		select: { id: true, organizationId: true, userId: true },
	});
	if (
		!site?.organizationId ||
		(!platformAdmin &&
			(site.organizationId !== dbUser.organizationId ||
				site.userId !== user.id))
	) {
		return { ok: false, error: "access_denied" } as const;
	}
	const flow = await resolveFlowModuleKeyForRuntime({
		organizationId: site.organizationId,
	});
	if (flow !== FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL) {
		return { ok: false, error: "access_denied" } as const;
	}
	const deleted = await prisma.site.deleteMany({
		where: { id: site.id, organizationId: site.organizationId },
	});
	if (deleted.count !== 1)
		return { ok: false, error: "access_denied" } as const;
	revalidatePath("/dashboard/sites");
	revalidatePath("/dashboard/invoices");
	revalidatePath("/dashboard/invoices/settings");
	return { ok: true } as const;
}
