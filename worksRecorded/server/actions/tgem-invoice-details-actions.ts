"use server";

import { z } from "zod";
import {
	normalizeTgemInvoiceDetailValue,
	type TgemEditableInvoiceField,
	type TgemInvoiceDetailsError,
} from "@/lib/tgem-invoice-approval/invoice-details";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

const inputSchema = z
	.object({
		invoiceCaseId: z.string().trim().min(1),
		field: z.enum(["invoiceNumber", "invoiceDate", "dueDate"]),
		value: z.string(),
		expectedUpdatedAt: z.string(),
	})
	.strict();

type UpdateResult =
	| { ok: false; error: TgemInvoiceDetailsError }
	| { ok: true; value: string | null; updatedAt: string; unchanged: boolean };

export async function updateTgemInvoiceDetail(input: {
	invoiceCaseId: string;
	field: TgemEditableInvoiceField;
	value: string;
	expectedUpdatedAt: string;
}): Promise<UpdateResult> {
	const user = await requireUser();
	const parsed = inputSchema.safeParse(input);
	if (!parsed.success) return { ok: false, error: "invalid_input" };
	const normalized = normalizeTgemInvoiceDetailValue(
		parsed.data.field,
		parsed.data.value,
	);
	if (!normalized.ok) return normalized;
	const version = z
		.string()
		.datetime()
		.safeParse(parsed.data.expectedUpdatedAt);
	if (!version.success) return { ok: false, error: "invalid_version" };
	const expectedUpdatedAt = new Date(version.data);
	const dbUser = await prisma.user.findFirst({
		where: { id: user.id, status: "active" },
		select: { organizationId: true },
	});
	if (!dbUser?.organizationId) return { ok: false, error: "access_denied" };
	const organizationId = dbUser.organizationId;
	const { invoiceCaseId, field } = parsed.data;

	return prisma.$transaction(async (tx): Promise<UpdateResult> => {
		const invoice = await tx.tgemInvoiceCase.findFirst({
			where: { id: invoiceCaseId, organizationId },
			select: {
				id: true,
				status: true,
				ocrStatus: true,
				extractionStatus: true,
				invoiceNumber: true,
				invoiceDate: true,
				dueDate: true,
				updatedAt: true,
			},
		});
		if (!invoice) return { ok: false, error: "access_denied" };
		if (
			invoice.status === "received" ||
			invoice.status === "processing" ||
			invoice.ocrStatus === "processing" ||
			invoice.extractionStatus === "processing"
		) {
			return { ok: false, error: "processing" };
		}
		if (invoice.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
			return { ok: false, error: "conflict" };
		}
		const current = invoice[field];
		const previous =
			current instanceof Date ? current.toISOString().slice(0, 10) : current;
		if (previous === normalized.value) {
			return {
				ok: true,
				value: normalized.value,
				updatedAt: invoice.updatedAt.toISOString(),
				unchanged: true,
			};
		}
		const next =
			field === "invoiceNumber" || normalized.value === null
				? normalized.value
				: new Date(`${normalized.value}T00:00:00.000Z`);
		const updatedAt = new Date(
			Math.max(Date.now(), invoice.updatedAt.getTime() + 1),
		);
		const updated = await tx.tgemInvoiceCase.updateMany({
			where: { id: invoice.id, organizationId, updatedAt: expectedUpdatedAt },
			data: { [field]: next, updatedAt },
		});
		if (updated.count !== 1) return { ok: false, error: "conflict" };
		await tx.tgemInvoiceAuditEvent.create({
			data: {
				invoiceCaseId: invoice.id,
				organizationId,
				actorUserId: user.id,
				actorType: "user",
				eventType: "invoice_details_updated",
				fromStatus: invoice.status,
				toStatus: invoice.status,
				payload: { field, previous, next: normalized.value },
			},
		});
		return {
			ok: true,
			value: normalized.value,
			updatedAt: updatedAt.toISOString(),
			unchanged: false,
		};
	});
}
