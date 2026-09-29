"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { canAccessFlowConfigAdmin } from "@/lib/production-flow/config";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

async function requireInvoiceArchiveAdmin() {
	const user = await requireUser();
	const requestHeaders = await headers();
	if (
		!canAccessFlowConfigAdmin(
			user.id,
			requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
		)
	) {
		notFound();
	}
	return user;
}

export async function restoreTgemArchivedInvoiceAction(formData: FormData) {
	const user = await requireInvoiceArchiveAdmin();
	const invoiceCaseId = String(formData.get("invoiceCaseId") ?? "").trim();
	if (!invoiceCaseId) throw new Error("Missing invoice id");

	await prisma.$transaction(async (tx) => {
		const invoice = await tx.tgemInvoiceCase.findFirst({
			where: { id: invoiceCaseId, archivedAt: { not: null } },
			select: {
				id: true,
				organizationId: true,
				status: true,
				archivedAt: true,
			},
		});
		if (!invoice) throw new Error("Archived invoice not found");

		const restored = await tx.tgemInvoiceCase.updateMany({
			where: { id: invoice.id, archivedAt: invoice.archivedAt },
			data: { archivedAt: null },
		});
		if (restored.count !== 1)
			throw new Error("Invoice changed. Reload and try again");

		await tx.tgemInvoiceAuditEvent.create({
			data: {
				invoiceCaseId: invoice.id,
				organizationId: invoice.organizationId,
				actorUserId: user.id,
				actorType: "user",
				eventType: "invoice_restored",
				fromStatus: invoice.status,
				toStatus: invoice.status,
				payload: {
					archivedAt: invoice.archivedAt?.toISOString() ?? null,
					restoredAt: new Date().toISOString(),
				},
			},
		});
	});

	revalidatePath("/dashboard/admin/tgem-invoice-archive");
}
