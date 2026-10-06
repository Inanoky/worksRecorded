"use server";

import { z } from "zod";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { TgemInvoiceSplitCalculationError } from "@/lib/tgem-invoice-approval/split-allocation";
import {
	splitTgemInvoiceCase,
	TgemInvoiceSplitServiceError,
} from "@/lib/tgem-invoice-approval/split-service";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

const decimalStringSchema = z.string().trim().min(1).max(100);
const projectIdSchema = z.string().trim().min(1).max(200);

const inputSchema = z
	.object({
		invoiceCaseId: z.string().trim().min(1).max(200),
		expectedUpdatedAt: z.string().datetime(),
		destinationProjectIds: z.array(projectIdSchema).min(1).max(100),
		residualProjectId: projectIdSchema.nullish(),
		invoicePercentageAllocations: z
			.array(
				z
					.object({
						projectId: projectIdSchema,
						percentage: decimalStringSchema,
					})
					.strict(),
			)
			.max(100)
			.optional(),
		lineRequests: z
			.array(
				z
					.object({
						lineId: z.string().trim().min(1).max(200),
						correctedSourceQuantity: decimalStringSchema.nullish(),
						wholeProjectId: projectIdSchema.nullish(),
						allocations: z
							.array(
								z
									.object({
										projectId: projectIdSchema,
										quantity: decimalStringSchema,
									})
									.strict(),
							)
							.max(100)
							.optional(),
						percentageAllocations: z
							.array(
								z
									.object({
										projectId: projectIdSchema,
										percentage: decimalStringSchema,
									})
									.strict(),
							)
							.max(100)
							.optional(),
					})
					.strict(),
			)
			.max(1000),
	})
	.strict();

export type SplitTgemInvoiceInput = z.infer<typeof inputSchema>;

export async function splitTgemInvoice(input: SplitTgemInvoiceInput) {
	const parsed = inputSchema.safeParse(input);
	if (!parsed.success) throw new TgemInvoiceSplitServiceError("invalid_input");
	const user = await requireUser();
	const dbUser = await prisma.user.findFirst({
		where: { id: user.id, status: "active" },
		select: { organizationId: true },
	});
	if (!dbUser?.organizationId) {
		throw new TgemInvoiceSplitServiceError("access_denied");
	}
	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		organizationId: dbUser.organizationId,
	});
	if (flowModuleKey !== FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL) {
		throw new TgemInvoiceSplitServiceError("access_denied");
	}

	return splitTgemInvoiceCase(prisma, {
		invoiceCaseId: parsed.data.invoiceCaseId,
		expectedUpdatedAt: new Date(parsed.data.expectedUpdatedAt),
		destinationProjectIds: parsed.data.destinationProjectIds,
		residualProjectId: parsed.data.residualProjectId ?? null,
		lineRequests: parsed.data.lineRequests,
		invoicePercentageAllocations:
			parsed.data.invoicePercentageAllocations ?? [],
		organizationId: dbUser.organizationId,
		actorUserId: user.id,
	});
}

export async function submitTgemInvoiceSplit(input: SplitTgemInvoiceInput) {
	try {
		return { ok: true as const, value: await splitTgemInvoice(input) };
	} catch (error) {
		if (
			error instanceof TgemInvoiceSplitServiceError ||
			error instanceof TgemInvoiceSplitCalculationError
		) {
			return { ok: false as const, error: error.code };
		}
		throw error;
	}
}
