"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

const TGEM_INVOICE_TYPES = new Set(["credit", "debit"]);

function normalizeCostCode(value: string) {
	const code = value.trim().toUpperCase();
	if (!code || code.length > 32 || !/^[A-Z0-9][A-Z0-9._/-]*$/.test(code)) {
		throw new Error(
			"Cost code must contain 1–32 letters, numbers, dots, dashes, slashes, or underscores",
		);
	}
	return code;
}

function normalizeCostCodeName(value: string) {
	const name = value.trim();
	if (!name || name.length > 120) {
		throw new Error("Cost code description must contain 1–120 characters");
	}
	return name;
}

async function requireActiveOrganization() {
	const user = await requireUser();
	const dbUser = await prisma.user.findFirst({
		where: { id: user.id, status: "active" },
		select: { organizationId: true },
	});
	if (!dbUser?.organizationId) throw new Error("Organization access denied");
	return { userId: user.id, organizationId: dbUser.organizationId };
}

export async function getTgemCostCodes(input?: { includeArchived?: boolean }) {
	const context = await requireActiveOrganization();
	return prisma.tgemCostCode.findMany({
		where: {
			organizationId: context.organizationId,
			...(input?.includeArchived ? {} : { isActive: true }),
		},
		orderBy: [{ isActive: "desc" }, { code: "asc" }],
		select: {
			id: true,
			code: true,
			name: true,
			isActive: true,
		},
	});
}

export async function saveTgemCostCode(input: {
	id?: string;
	code: string;
	name: string;
}) {
	const context = await requireActiveOrganization();
	const code = normalizeCostCode(input.code);
	const name = normalizeCostCodeName(input.name);

	const duplicate = await prisma.tgemCostCode.findFirst({
		where: {
			organizationId: context.organizationId,
			code,
			...(input.id ? { id: { not: input.id } } : {}),
		},
		select: { id: true },
	});
	if (duplicate) throw new Error("This cost code already exists");

	if (input.id) {
		const updated = await prisma.tgemCostCode.updateMany({
			where: { id: input.id, organizationId: context.organizationId },
			data: { code, name },
		});
		if (updated.count !== 1) throw new Error("Cost code access denied");
		return prisma.tgemCostCode.findUniqueOrThrow({
			where: { id: input.id },
			select: { id: true, code: true, name: true, isActive: true },
		});
	}

	return prisma.tgemCostCode.create({
		data: {
			organizationId: context.organizationId,
			code,
			name,
		},
		select: { id: true, code: true, name: true, isActive: true },
	});
}

export async function setTgemCostCodeActive(input: {
	id: string;
	isActive: boolean;
}) {
	const context = await requireActiveOrganization();
	const updated = await prisma.tgemCostCode.updateMany({
		where: { id: input.id, organizationId: context.organizationId },
		data: { isActive: input.isActive },
	});
	if (updated.count !== 1) throw new Error("Cost code access denied");
	return { id: input.id, isActive: input.isActive };
}

export async function updateTgemInvoiceAccounting(input: {
	invoiceCaseId: string;
	invoiceType: string;
	costCode: string | null;
	expectedUpdatedAt: string;
}) {
	const context = await requireActiveOrganization();
	if (!TGEM_INVOICE_TYPES.has(input.invoiceType)) {
		throw new Error("Invoice type must be credit or debit");
	}
	const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
	if (Number.isNaN(expectedUpdatedAt.getTime())) {
		throw new Error("The invoice version is invalid");
	}
	const costCode = input.costCode ? normalizeCostCode(input.costCode) : null;

	return prisma.$transaction(async (tx) => {
		const invoiceCase = await tx.tgemInvoiceCase.findFirst({
			where: {
				id: input.invoiceCaseId,
				organizationId: context.organizationId,
			},
			select: {
				id: true,
				organizationId: true,
				status: true,
				invoiceType: true,
				costCode: true,
				updatedAt: true,
			},
		});
		if (!invoiceCase) throw new Error("Invoice access denied");
		if (invoiceCase.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
			throw new Error("The invoice changed. Reload it and try again");
		}

		if (costCode) {
			const availableCode = await tx.tgemCostCode.findFirst({
				where: {
					organizationId: context.organizationId,
					code: costCode,
					isActive: true,
				},
				select: { id: true },
			});
			if (!availableCode) throw new Error("Select an active cost code");
		}

		if (
			invoiceCase.invoiceType === input.invoiceType &&
			invoiceCase.costCode === costCode
		) {
			return { invoiceCaseId: invoiceCase.id, unchanged: true };
		}

		const updated = await tx.tgemInvoiceCase.updateMany({
			where: { id: invoiceCase.id, updatedAt: expectedUpdatedAt },
			data: { invoiceType: input.invoiceType, costCode },
		});
		if (updated.count !== 1) {
			throw new Error("The invoice changed. Reload it and try again");
		}

		await tx.tgemInvoiceAuditEvent.create({
			data: {
				invoiceCaseId: invoiceCase.id,
				organizationId: invoiceCase.organizationId,
				actorUserId: context.userId,
				actorType: "user",
				eventType: "invoice_accounting_updated",
				fromStatus: invoiceCase.status,
				toStatus: invoiceCase.status,
				payload: {
					previous: {
						invoiceType: invoiceCase.invoiceType,
						costCode: invoiceCase.costCode,
					},
					next: { invoiceType: input.invoiceType, costCode },
				} satisfies Prisma.InputJsonValue,
			},
		});

		return { invoiceCaseId: invoiceCase.id, unchanged: false };
	});
}
