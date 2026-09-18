"use server";

import { z } from "zod";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

const inputSchema = z
	.array(
		z
			.object({
				id: z.string().trim().min(1),
				updatedAt: z.string().datetime(),
			})
			.strict(),
	)
	.min(1)
	.max(1000);

export type TgemInvoiceDeleteResult =
	| { ok: true; deletedIds: string[] }
	| {
			ok: false;
			error: "invalid_input" | "access_denied" | "processing" | "conflict";
	  };

export async function deleteTgemInvoices(
	input: { id: string; updatedAt: string }[],
): Promise<TgemInvoiceDeleteResult> {
	const user = await requireUser();
	const parsed = inputSchema.safeParse(input);
	if (!parsed.success) return { ok: false, error: "invalid_input" };
	const targets = [
		...new Map(parsed.data.map((item) => [item.id, item])).values(),
	];
	const dbUser = await prisma.user.findFirst({
		where: { id: user.id, status: "active" },
		select: { organizationId: true },
	});
	if (!dbUser?.organizationId) return { ok: false, error: "access_denied" };
	const organizationId = dbUser.organizationId;
	const flow = await resolveFlowModuleKeyForRuntime({ organizationId });
	if (flow !== FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL) {
		return { ok: false, error: "access_denied" };
	}
	const conflict = new Error("Invoice deletion conflict");
	try {
		return await prisma.$transaction(
			async (tx): Promise<TgemInvoiceDeleteResult> => {
				const invoices = await tx.tgemInvoiceCase.findMany({
					where: { organizationId, id: { in: targets.map((item) => item.id) } },
					select: {
						id: true,
						updatedAt: true,
						status: true,
						ocrStatus: true,
						extractionStatus: true,
					},
				});
				if (invoices.length !== targets.length)
					return { ok: false, error: "access_denied" };
				if (
					invoices.some(
						(invoice) =>
							invoice.status === "received" ||
							invoice.status === "processing" ||
							invoice.ocrStatus === "processing" ||
							invoice.extractionStatus === "processing",
					)
				)
					return { ok: false, error: "processing" };
				const versions = new Map(
					targets.map((item) => [item.id, new Date(item.updatedAt).getTime()]),
				);
				if (
					invoices.some(
						(invoice) =>
							invoice.updatedAt.getTime() !== versions.get(invoice.id),
					)
				) {
					return { ok: false, error: "conflict" };
				}
				const deleted = await tx.tgemInvoiceCase.deleteMany({
					where: {
						organizationId,
						OR: targets.map((item) => ({
							id: item.id,
							updatedAt: new Date(item.updatedAt),
						})),
						status: { notIn: ["received", "processing"] },
						ocrStatus: { not: "processing" },
						extractionStatus: { not: "processing" },
					},
				});
				if (deleted.count !== targets.length) throw conflict;
				return { ok: true, deletedIds: targets.map((item) => item.id) };
			},
		);
	} catch (error) {
		if (error === conflict) return { ok: false, error: "conflict" };
		throw error;
	}
}
