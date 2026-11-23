import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
	isTgemAccessOrganization,
	requireTgemPermission,
} from "@/lib/tgem-invoice-approval/access";
import {
	TGEM_DRAFT_MAX_BYTES,
	TGEM_DRAFT_MAX_FILES,
} from "@/lib/tgem-invoice-approval/draft-limits";
import {
	isSupportedTgemInvoiceContentType,
	MAX_TGEM_INVOICE_BYTES,
} from "@/lib/tgem-invoice-approval/intake";
import { getTgemInvoiceProcessor } from "@/lib/tgem-invoice-approval/processor-config";
import { prisma } from "@/lib/utils/db";

export {
	TGEM_DRAFT_MAX_BYTES,
	TGEM_DRAFT_MAX_FILES,
} from "@/lib/tgem-invoice-approval/draft-limits";
export type TgemDraftScope = {
	organizationId: string;
	userId: string;
	siteId: string;
	businessPhoneNumberId: string;
	sender: string;
};
export type TgemDraftAction = "submit" | "more" | "together" | "separate";
export const tgemDraftInclude = {
	files: {
		orderBy: [{ position: "asc" as const }, { createdAt: "asc" as const }],
	},
};
export type TgemUploadDraft = Prisma.TgemInvoiceUploadDraftGetPayload<{
	include: typeof tgemDraftInclude;
}>;

export function tgemDraftActiveKey(scope: TgemDraftScope) {
	return JSON.stringify([
		scope.organizationId,
		scope.userId,
		scope.businessPhoneNumberId,
	]);
}

function owner(scope: TgemDraftScope) {
	return {
		organizationId: scope.organizationId,
		userId: scope.userId,
		businessPhoneNumberId: scope.businessPhoneNumberId,
	};
}

async function authorize(scope: TgemDraftScope) {
	if (!(await isTgemAccessOrganization(prisma, scope.organizationId)))
		throw new Error("TGEM access denied");
	const project = await prisma.site.findFirst({
		where: { id: scope.siteId, organizationId: scope.organizationId },
		select: { id: true },
	});
	if (!project) throw new Error("Project access denied");
	await requireTgemPermission(prisma, {
		userId: scope.userId,
		organizationId: scope.organizationId,
		siteId: scope.siteId,
		permission: "invoice.view",
	});
}

async function lock(tx: Prisma.TransactionClient, id: string) {
	await tx.$queryRaw(
		Prisma.sql`SELECT "id" FROM "TgemInvoiceUploadDraft" WHERE "id" = ${id} FOR UPDATE`,
	);
}

export async function findTgemUploadDraft(scope: TgemDraftScope, id?: string) {
	return prisma.tgemInvoiceUploadDraft.findFirst({
		where: {
			...owner(scope),
			...(id ? { id } : { activeKey: tgemDraftActiveKey(scope) }),
		},
		include: tgemDraftInclude,
	});
}

export async function createTgemWebUploadDraft(
	scope: TgemDraftScope,
	files: ReadonlyArray<{ name: string; type: string; size: number }>,
) {
	await authorize(scope);
	if (scope.businessPhoneNumberId !== "dashboard")
		throw new Error("Invalid upload channel");
	if (
		!files.length ||
		files.length > TGEM_DRAFT_MAX_FILES ||
		files.some(
			(file) =>
				!isSupportedTgemInvoiceContentType(file.type) ||
				file.size <= 0 ||
				file.size > MAX_TGEM_INVOICE_BYTES,
		) ||
		files.reduce((sum, file) => sum + file.size, 0) > TGEM_DRAFT_MAX_BYTES
	)
		throw new Error(
			"Izvēlieties līdz 10 PDF, JPG, PNG vai WebP failiem; katrs līdz 16 MB, kopā līdz 32 MB.",
		);
	const id = randomUUID();
	return prisma.tgemInvoiceUploadDraft.create({
		data: {
			...scope,
			id,
			source: "dashboard",
			status: "choosing",
			files: {
				create: files.map((file, position) => ({
					sourceKey: JSON.stringify(["dashboard", id, position]),
					messageId: `${id}:${position}`,
					originalFilename: file.name,
					contentType: file.type,
					byteSize: file.size,
					position,
				})),
			},
		},
		include: tgemDraftInclude,
	});
}

export async function reserveTgemDraftFile(
	scope: TgemDraftScope,
	input: {
		messageId: string;
		originalFilename: string;
		contentType: string;
	},
) {
	await authorize(scope);
	const sourceKey = JSON.stringify([
		"whatsapp",
		scope.organizationId,
		scope.businessPhoneNumberId,
		input.messageId,
	]);
	return prisma.$transaction(
		async (tx) => {
			const existing = await tx.tgemInvoiceDraftFile.findUnique({
				where: { sourceKey },
				include: { draft: { include: tgemDraftInclude } },
			});
			if (existing && existing.draft.userId !== scope.userId)
				throw new Error("Draft file access denied");
			if (
				existing &&
				(existing.status !== "failed" ||
					!["collecting", "choosing"].includes(existing.draft.status))
			)
				return { file: existing, draft: existing.draft, upload: false };
			const initial = await tx.tgemInvoiceUploadDraft.upsert({
				where: { activeKey: tgemDraftActiveKey(scope) },
				update: { updatedAt: new Date() },
				create: { ...scope, activeKey: tgemDraftActiveKey(scope) },
			});
			await lock(tx, initial.id);
			const draft = await tx.tgemInvoiceUploadDraft.findUniqueOrThrow({
				where: { id: initial.id },
				include: tgemDraftInclude,
			});
			if (draft.siteId !== scope.siteId)
				throw new Error("draft_project_changed");
			if (!["collecting", "choosing"].includes(draft.status))
				throw new Error("draft_closed");
			if (
				draft.files.filter((file) => file.status !== "failed").length >=
				TGEM_DRAFT_MAX_FILES
			)
				throw new Error("draft_file_limit");
			const file =
				existing?.draftId === draft.id
					? await tx.tgemInvoiceDraftFile.update({
							where: { id: existing.id },
							data: { status: "uploading" },
						})
					: await tx.tgemInvoiceDraftFile.create({
							data: {
								...input,
								draftId: draft.id,
								sourceKey,
								position: draft.revision + 1,
							},
						});
			await tx.tgemInvoiceUploadDraft.update({
				where: { id: draft.id },
				data: { status: "collecting", revision: { increment: 1 } },
			});
			return { file, draft, upload: true };
		},
		{ timeout: 15_000 },
	);
}

export async function completeTgemDraftFile(
	scope: TgemDraftScope,
	fileId: string,
	storage: {
		canonicalUrl: string;
		storageKey: string;
		byteSize: number;
		sha256: string;
	} | null,
) {
	const completed = await prisma.$transaction(
		async (tx) => {
			const file = await tx.tgemInvoiceDraftFile.findFirst({
				where: { id: fileId, draft: owner(scope) },
			});
			if (!file) throw new Error("Draft file access denied");
			await lock(tx, file.draftId);
			const bytes = await tx.tgemInvoiceDraftFile.aggregate({
				where: { draftId: file.draftId, status: "ready", id: { not: fileId } },
				_sum: { byteSize: true },
			});
			const tooLarge =
				storage &&
				(bytes._sum.byteSize ?? 0) + storage.byteSize > TGEM_DRAFT_MAX_BYTES;
			await tx.tgemInvoiceDraftFile.update({
				where: { id: fileId },
				data:
					storage && !tooLarge
						? { ...storage, status: "ready" }
						: { status: "failed" },
			});
			const draft = await tx.tgemInvoiceUploadDraft.update({
				where: { id: file.draftId },
				data: { revision: { increment: 1 } },
				include: tgemDraftInclude,
			});
			return { draft, tooLarge };
		},
		{ timeout: 15_000 },
	);
	if (completed.tooLarge) throw new Error("draft_byte_limit");
	return completed.draft;
}

export function tgemDraftDecision(
	draft: TgemUploadDraft,
	action: TgemDraftAction,
	revision: number,
) {
	if (!["submit", "more", "together", "separate"].includes(action))
		return "unsupported";
	if (draft.status === "submitted")
		return action === "submit" || action === "together" || action === "separate"
			? "submitted"
			: "closed";
	if (!["collecting", "choosing"].includes(draft.status)) return "closed";
	if (draft.revision !== revision) return "stale";
	if (action === "more") return "more";
	if (draft.files.some((file) => file.status === "uploading"))
		return "uploading";
	const ready = draft.files.filter((file) => file.status === "ready");
	if (!ready.length) return "empty";
	if (action === "submit" && ready.length > 1 && draft.source !== "whatsapp")
		return "choose";
	if (action !== "submit" && draft.status !== "choosing") return "stale";
	return action === "separate" ? "separate" : "together";
}

export async function applyTgemDraftAction(
	scope: TgemDraftScope,
	id: string,
	revision: number,
	action: TgemDraftAction,
) {
	await authorize(scope);
	return prisma.$transaction(
		async (tx) => {
			await lock(tx, id);
			const draft = await tx.tgemInvoiceUploadDraft.findFirst({
				where: { ...owner(scope), id, siteId: scope.siteId },
				include: tgemDraftInclude,
			});
			if (!draft) throw new Error("Draft access denied");
			const decision = tgemDraftDecision(draft, action, revision);
			if (
				draft.source === "dashboard" &&
				["together", "separate"].includes(decision) &&
				draft.files.some((file) => file.status !== "ready")
			)
				throw new Error(
					"Visiem paketes failiem jābūt augšupielādētiem pirms iesniegšanas.",
				);
			if (decision === "choose") {
				const next = await tx.tgemInvoiceUploadDraft.update({
					where: { id },
					data: {
						status: "choosing",
						revision: { increment: 1 },
					},
					include: tgemDraftInclude,
				});
				return { decision, draft: next, invoices: [] };
			}
			if (!["together", "separate", "submitted"].includes(decision))
				return { decision, draft, invoices: [] };
			if (decision !== "submitted") {
				await requireTgemPermission(tx, {
					...scope,
					permission: "invoice.submit_approval",
				});
				const ready = draft.files.filter((file) => file.status === "ready");
				if (ready.some((file) => !file.canonicalUrl || !file.storageKey))
					throw new Error("draft_storage_missing");
				if (
					decision === "together" &&
					ready.length > 1 &&
					getTgemInvoiceProcessor() !== "openai"
				)
					throw new Error("draft_package_processor_unsupported");
				const groups =
					decision === "separate" ? ready.map((file) => [file]) : [ready];
				for (const [index, files] of groups.entries()) {
					await tx.tgemInvoiceCase.create({
						data: {
							organizationId: scope.organizationId,
							siteId: draft.siteId,
							submittedByUserId: scope.userId,
							uploadDraftId: id,
							source: draft.source,
							sourceSender: draft.sender,
							sourceMessageId: `draft:${id}:${index}`,
							idempotencyKey: `tgem-invoice:${scope.organizationId}:${draft.source}:draft:${id}:${index}`,
							documents: {
								create: files.map((file) => ({
									uploadDraftFileId: file.id,
									storageProvider: "uploadthing",
									storageKey: file.storageKey,
									canonicalUrl: file.canonicalUrl ?? "",
									originalFilename: file.originalFilename,
									contentType: file.contentType,
									byteSize: file.byteSize,
									documentOrder: file.position,
									sha256: file.sha256,
									source: draft.source,
								})),
							},
							auditEvents: {
								create: {
									organizationId: scope.organizationId,
									actorUserId: scope.userId,
									actorType: draft.source === "dashboard" ? "user" : "whatsapp",
									eventType: "invoice_received",
									toStatus: "received",
									payload: {
										uploadDraftId: id,
										documentCount: files.length,
										submissionMode: decision,
									},
								},
							},
						},
					});
				}
				await tx.tgemInvoiceUploadDraft.update({
					where: { id },
					data: {
						status: "submitted",
						submissionMode: decision,
						activeKey: null,
						revision: { increment: 1 },
					},
				});
			}
			const invoices = await tx.tgemInvoiceCase.findMany({
				where: { uploadDraftId: id, archivedAt: null },
				select: {
					id: true,
					status: true,
					documents: {
						orderBy: [{ documentOrder: "asc" }, { createdAt: "asc" }],
						take: 1,
						select: { id: true },
					},
				},
			});
			return { decision, draft, invoices };
		},
		{ timeout: 15_000 },
	);
}
