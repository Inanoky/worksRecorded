import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
	calculateTgemInvoiceSplit,
	type TgemInvoiceSplitCalculationResult,
	type TgemInvoiceSplitLineRequest,
} from "@/lib/tgem-invoice-approval/split-allocation";

export type TgemInvoiceSplitServiceInput = {
	invoiceCaseId: string;
	expectedUpdatedAt: Date;
	destinationProjectIds: string[];
	residualProjectId: string | null;
	lineRequests: TgemInvoiceSplitLineRequest[];
	invoicePercentageAllocations?: Array<{
		projectId: string;
		percentage: string;
	}>;
	organizationId: string;
	actorUserId: string;
};

export type TgemInvoiceSplitChildResult = {
	id: string;
	projectId: string;
	kind: "allocated" | "residual";
	generation: number;
	total: string | null;
	updatedAt: string;
};

export type TgemInvoiceSplitServiceResult = {
	parentInvoiceCaseId: string;
	rootInvoiceCaseId: string;
	children: TgemInvoiceSplitChildResult[];
	replayed: boolean;
};

export type TgemInvoiceSplitServiceErrorCode =
	| "access_denied"
	| "approval_decided"
	| "conflict"
	| "extraction_incomplete"
	| "invalid_input"
	| "invalid_state"
	| "non_leaf"
	| "paid"
	| "processing"
	| "project_unavailable";

export class TgemInvoiceSplitServiceError extends Error {
	readonly code: TgemInvoiceSplitServiceErrorCode;

	constructor(code: TgemInvoiceSplitServiceErrorCode) {
		super(code);
		this.name = "TgemInvoiceSplitServiceError";
		this.code = code;
	}
}

type TgemInvoiceSplitDatabase = Pick<
	PrismaClient,
	"$transaction" | "tgemInvoiceCase"
>;

const COMPLETED_APPROVAL_STEP_STATUSES = new Set([
	"approved",
	"rejected",
	"changes_requested",
]);

function fail(code: TgemInvoiceSplitServiceErrorCode): never {
	throw new TgemInvoiceSplitServiceError(code);
}

function decimalString(value: Prisma.Decimal | null) {
	return value?.toString() ?? null;
}

const SPLIT_INVOICE_NUMBER_MAX_LENGTH = 120;
const CLEAN_SPLIT_PATH_PATTERN = /(-S\d+(?:\.\d+)*)$/;
const LEGACY_SPLIT_PATH_PATTERN = /(-S\d+-[A-F0-9]{12}(?:\.\d+)*)$/i;

export function buildTgemSplitInvoiceNumber(
	parentInvoiceNumber: string | null,
	parentInvoiceCaseId: string,
	parentGeneration: number,
	childOrdinal: number,
) {
	const parentNumber =
		parentInvoiceNumber?.trim() || `SPLIT-${parentInvoiceCaseId}`;
	if (parentGeneration === 0) {
		const splitPath = `-S${childOrdinal}`;
		return `${parentNumber.slice(0, SPLIT_INVOICE_NUMBER_MAX_LENGTH - splitPath.length)}${splitPath}`;
	}

	const existingPathMatch =
		parentNumber.match(CLEAN_SPLIT_PATH_PATTERN) ??
		parentNumber.match(LEGACY_SPLIT_PATH_PATTERN);
	const existingPath = existingPathMatch?.[1] ?? "";
	const base = existingPath
		? parentNumber.slice(0, -existingPath.length)
		: parentNumber;
	const splitPath = `${existingPath}.${childOrdinal}`;
	return `${base.slice(0, Math.max(0, SPLIT_INVOICE_NUMBER_MAX_LENGTH - splitPath.length))}${splitPath}`;
}

function normalizeDecimalForFingerprint(value: string) {
	try {
		return new Prisma.Decimal(value.trim()).toString();
	} catch {
		return value.trim();
	}
}

function buildRequestFingerprint(
	input: TgemInvoiceSplitServiceInput,
	effectiveResidualProjectId: string | null,
) {
	const destinationOrder = new Map(
		input.destinationProjectIds.map((projectId, index) => [
			projectId.trim(),
			index,
		]),
	);
	const normalizePercentageAllocations = (
		allocations: NonNullable<
			TgemInvoiceSplitLineRequest["percentageAllocations"]
		>,
	) =>
		[...allocations]
			.map((allocation) => ({
				projectId: allocation.projectId.trim(),
				percentage: normalizeDecimalForFingerprint(allocation.percentage),
			}))
			.sort(
				(left, right) =>
					(destinationOrder.get(left.projectId) ?? Number.MAX_SAFE_INTEGER) -
						(destinationOrder.get(right.projectId) ??
							Number.MAX_SAFE_INTEGER) ||
					left.projectId.localeCompare(right.projectId),
			);
	const lineRequests = input.lineRequests
		.map((request) => ({
			lineId: request.lineId.trim(),
			correctedSourceQuantity: request.correctedSourceQuantity
				? normalizeDecimalForFingerprint(request.correctedSourceQuantity)
				: null,
			wholeProjectId: request.wholeProjectId?.trim() || null,
			allocations: [...(request.allocations ?? [])]
				.map((allocation) => ({
					projectId: allocation.projectId.trim(),
					quantity: normalizeDecimalForFingerprint(allocation.quantity),
				}))
				.sort(
					(left, right) =>
						(destinationOrder.get(left.projectId) ?? Number.MAX_SAFE_INTEGER) -
							(destinationOrder.get(right.projectId) ??
								Number.MAX_SAFE_INTEGER) ||
						left.projectId.localeCompare(right.projectId),
				),
			...(request.percentageAllocations?.length
				? {
						percentageAllocations: normalizePercentageAllocations(
							request.percentageAllocations,
						),
					}
				: {}),
		}))
		.sort((left, right) => left.lineId.localeCompare(right.lineId));

	return createHash("sha256")
		.update(
			JSON.stringify({
				invoiceCaseId: input.invoiceCaseId.trim(),
				expectedUpdatedAt: input.expectedUpdatedAt.toISOString(),
				destinationProjectIds: input.destinationProjectIds.map((projectId) =>
					projectId.trim(),
				),
				residualProjectId: effectiveResidualProjectId,
				...(input.invoicePercentageAllocations?.length
					? {
							invoicePercentageAllocations: normalizePercentageAllocations(
								input.invoicePercentageAllocations,
							),
						}
					: {}),
				lineRequests,
			}),
		)
		.digest("hex");
}

function getAuditRequestFingerprint(value: Prisma.JsonValue | null) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const fingerprint = value.requestFingerprint;
	return typeof fingerprint === "string" ? fingerprint : null;
}

function optionalJson(value: Prisma.JsonValue | null) {
	return value === null ? undefined : (value as Prisma.InputJsonValue);
}

function childResult(child: {
	id: string;
	siteId: string | null;
	splitKind: string | null;
	splitGeneration: number;
	total: Prisma.Decimal | null;
	updatedAt: Date;
}): TgemInvoiceSplitChildResult {
	if (
		!child.siteId ||
		(child.splitKind !== "allocated" && child.splitKind !== "residual")
	) {
		return fail("conflict");
	}
	return {
		id: child.id,
		projectId: child.siteId,
		kind: child.splitKind,
		generation: child.splitGeneration,
		total: decimalString(child.total),
		updatedAt: child.updatedAt.toISOString(),
	};
}

function allocationSummary(
	calculatedCase: TgemInvoiceSplitCalculationResult["cases"][number],
) {
	return {
		projectId: calculatedCase.projectId,
		kind: calculatedCase.kind,
		lineSum: calculatedCase.lineSum,
		subtotalAdjustment: calculatedCase.subtotalAdjustment,
		subtotal: calculatedCase.subtotal,
		vat: calculatedCase.vat,
		total: calculatedCase.total,
		lines: calculatedCase.lines.map((line) => ({
			sourceLineId: line.sourceLineId,
			lineNumber: line.lineNumber,
			quantity: line.quantity,
			total: line.total,
		})),
	};
}

function isRetryableTransactionConflict(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error.code === "P2002" || error.code === "P2034")
	);
}

async function runSplitTransaction(
	database: TgemInvoiceSplitDatabase,
	input: TgemInvoiceSplitServiceInput,
): Promise<TgemInvoiceSplitServiceResult> {
	return database.$transaction(
		async (tx) => {
			const parent = await tx.tgemInvoiceCase.findFirst({
				where: {
					id: input.invoiceCaseId,
					organizationId: input.organizationId,
				},
				include: {
					lines: { orderBy: { lineNumber: "asc" } },
					documents: {
						orderBy: { createdAt: "asc" },
						include: { ocrPages: { orderBy: { pageNumber: "asc" } } },
					},
					approvalSteps: {
						select: { status: true, decidedAt: true },
					},
					splitChildren: {
						orderBy: { createdAt: "asc" },
						select: {
							id: true,
							siteId: true,
							splitKind: true,
							splitGeneration: true,
							total: true,
							updatedAt: true,
						},
					},
					auditEvents: {
						where: { eventType: "invoice_split" },
						orderBy: { createdAt: "desc" },
						select: { payload: true },
					},
				},
			});
			if (!parent) return fail("access_denied");

			const effectiveResidualProjectId = parent.siteId
				? input.destinationProjectIds.includes(parent.siteId)
					? null
					: parent.siteId
				: input.residualProjectId;
			if (
				parent.siteId &&
				input.residualProjectId &&
				input.residualProjectId !== parent.siteId
			) {
				return fail("project_unavailable");
			}
			const requestFingerprint = buildRequestFingerprint(
				input,
				effectiveResidualProjectId,
			);
			const rootInvoiceCaseId = parent.splitRootInvoiceCaseId ?? parent.id;

			if (parent.archivedAt) {
				const matchingAudit = parent.auditEvents.some(
					(event) =>
						getAuditRequestFingerprint(event.payload) === requestFingerprint,
				);
				if (
					parent.status !== "split" ||
					!matchingAudit ||
					parent.splitChildren.length === 0
				) {
					return fail("conflict");
				}
				return {
					parentInvoiceCaseId: parent.id,
					rootInvoiceCaseId,
					children: parent.splitChildren.map(childResult),
					replayed: true,
				};
			}

			if (parent.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
				return fail("conflict");
			}
			if (parent.splitChildren.length > 0) return fail("non_leaf");
			if (
				parent.status === "received" ||
				parent.status === "processing" ||
				parent.ocrStatus === "processing" ||
				parent.extractionStatus === "processing"
			) {
				return fail("processing");
			}
			if (
				parent.ocrStatus !== "complete" ||
				parent.extractionStatus !== "complete"
			) {
				return fail("extraction_incomplete");
			}
			if (parent.paymentStatus !== "unpaid") return fail("paid");
			if (parent.status !== "needs_review" && parent.status !== "in_approval") {
				return fail("invalid_state");
			}
			if (
				parent.approvalSteps.some(
					(step) =>
						step.decidedAt !== null ||
						COMPLETED_APPROVAL_STEP_STATUSES.has(step.status),
				)
			) {
				return fail("approval_decided");
			}

			const calculation = calculateTgemInvoiceSplit({
				currency: parent.currency,
				subtotal: decimalString(parent.subtotal),
				vat: decimalString(parent.vat),
				total: decimalString(parent.total),
				destinationProjectIds: input.destinationProjectIds,
				residualProjectId: effectiveResidualProjectId,
				lines: parent.lines.map((line) => ({
					id: line.id,
					lineNumber: line.lineNumber,
					description: line.description,
					quantity: decimalString(line.quantity),
					unit: line.unit,
					unitPrice: decimalString(line.unitPrice),
					total: decimalString(line.total),
					currency: line.currency,
					costCode: line.costCode,
					category: line.category,
					suggestedProjectId: line.suggestedProjectId,
					suggestedCostCode: line.suggestedCostCode,
					suggestedCategory: line.suggestedCategory,
					aiConfidence: line.aiConfidence,
					sourceText: line.sourceText,
				})),
				lineRequests: input.lineRequests,
				invoicePercentageAllocations: input.invoicePercentageAllocations ?? [],
			});
			const projects = await tx.site.findMany({
				where: {
					organizationId: input.organizationId,
					id: { in: calculation.cases.map((entry) => entry.projectId) },
				},
				select: { id: true },
			});
			if (projects.length !== calculation.cases.length) {
				return fail("project_unavailable");
			}

			const splitAt = new Date();
			const claimed = await tx.tgemInvoiceCase.updateMany({
				where: {
					id: parent.id,
					organizationId: input.organizationId,
					archivedAt: null,
					updatedAt: input.expectedUpdatedAt,
					status: parent.status,
					paymentStatus: "unpaid",
				},
				data: {
					status: "split",
					archivedAt: splitAt,
					splitRootInvoiceCaseId: rootInvoiceCaseId,
					updatedAt: splitAt,
				},
			});
			if (claimed.count !== 1) return fail("conflict");

			await tx.tgemInvoiceApprovalStep.updateMany({
				where: {
					invoiceCaseId: parent.id,
					status: { in: ["current", "waiting"] },
				},
				data: { status: "cancelled" },
			});

			const childGeneration = parent.splitGeneration + 1;
			const createdChildren: TgemInvoiceSplitChildResult[] = [];
			let allocatedChildOrdinal = 2;
			for (const [index, calculatedCase] of calculation.cases.entries()) {
				const summary = allocationSummary(calculatedCase);
				const childOrdinal =
					calculatedCase.kind === "residual" ? 1 : allocatedChildOrdinal++;
				const child = await tx.tgemInvoiceCase.create({
					data: {
						organizationId: parent.organizationId,
						siteId: calculatedCase.projectId,
						submittedByUserId: parent.submittedByUserId,
						idempotencyKey: `tgem-invoice-split:${parent.id}:${requestFingerprint}:${index}`,
						source: parent.source,
						sourceMessageId: parent.sourceMessageId,
						sourceSender: parent.sourceSender,
						status: "needs_review",
						ocrStatus: parent.ocrStatus,
						extractionStatus: parent.extractionStatus,
						processingError: null,
						invoiceNumber: buildTgemSplitInvoiceNumber(
							parent.invoiceNumber,
							parent.id,
							parent.splitGeneration,
							childOrdinal,
						),
						supplierName: parent.supplierName,
						supplierRegistrationNo: parent.supplierRegistrationNo,
						invoiceDate: parent.invoiceDate,
						dueDate: parent.dueDate,
						currency: calculation.currency,
						subtotal: calculatedCase.subtotal,
						vat: calculatedCase.vat,
						total: calculatedCase.total,
						bankAccount: parent.bankAccount,
						reference: parent.reference,
						invoiceType: parent.invoiceType,
						costCode: parent.costCode,
						validationSummary: optionalJson(parent.validationSummary),
						extractionSummary: optionalJson(parent.extractionSummary),
						sourceContext: optionalJson(parent.sourceContext),
						projectMatchConfidence: 1,
						projectMatchMethod: "invoice_split",
						projectMatchSummary: {
							parentInvoiceCaseId: parent.id,
							projectId: calculatedCase.projectId,
						},
						receivedAt: parent.receivedAt,
						processedAt: parent.processedAt,
						approvedAt: null,
						paymentStatus: "unpaid",
						paidAt: null,
						approvalRound: 0,
						approvalRouteSnapshot: Prisma.DbNull,
						splitParentInvoiceCaseId: parent.id,
						splitRootInvoiceCaseId: rootInvoiceCaseId,
						splitGeneration: childGeneration,
						splitKind: calculatedCase.kind,
						splitSubtotalAdjustment: calculatedCase.subtotalAdjustment,
						lines: {
							create: calculatedCase.lines.map((line) => ({
								lineNumber: line.lineNumber,
								description: line.description,
								quantity: line.quantity,
								unit: line.unit,
								unitPrice: line.unitPrice,
								total: line.total,
								currency: line.currency,
								projectId: calculatedCase.projectId,
								costCode: line.costCode,
								category: line.category,
								suggestedProjectId: line.suggestedProjectId,
								suggestedCostCode: line.suggestedCostCode,
								suggestedCategory: line.suggestedCategory,
								aiConfidence: line.aiConfidence,
								sourceText: line.sourceText,
							})),
						},
						...(parent.documents.length > 0
							? {
									documents: {
										create: parent.documents.map((document) => ({
											storageProvider: document.storageProvider,
											storageKey: document.storageKey,
											canonicalUrl: document.canonicalUrl,
											originalFilename: document.originalFilename,
											contentType: document.contentType,
											byteSize: document.byteSize,
											sha256: document.sha256,
											source: document.source,
											...(document.ocrPages.length > 0
												? {
														ocrPages: {
															create: document.ocrPages.map((page) => ({
																pageNumber: page.pageNumber,
																width: page.width,
																height: page.height,
																text: page.text,
																blocks: optionalJson(page.blocks),
																renderedImageUrl: page.renderedImageUrl,
																status: page.status,
																errorMessage: page.errorMessage,
															})),
														},
													}
												: {}),
										})),
									},
								}
							: {}),
						auditEvents: {
							create: {
								organizationId: parent.organizationId,
								actorUserId: input.actorUserId,
								actorType: "user",
								eventType: "invoice_created_from_split",
								toStatus: "needs_review",
								payload: {
									requestFingerprint,
									parentInvoiceCaseId: parent.id,
									rootInvoiceCaseId,
									generation: childGeneration,
									kind: calculatedCase.kind,
									allocation: summary,
								},
							},
						},
					},
					select: {
						id: true,
						siteId: true,
						splitKind: true,
						splitGeneration: true,
						total: true,
						updatedAt: true,
					},
				});
				createdChildren.push(childResult(child));
			}

			await tx.tgemInvoiceAuditEvent.create({
				data: {
					invoiceCaseId: parent.id,
					organizationId: parent.organizationId,
					actorUserId: input.actorUserId,
					actorType: "user",
					eventType: "invoice_split",
					fromStatus: parent.status,
					toStatus: "split",
					payload: {
						requestFingerprint,
						rootInvoiceCaseId,
						parentGeneration: parent.splitGeneration,
						childGeneration,
						splitAt: splitAt.toISOString(),
						quantityCorrections: calculation.quantityCorrections,
						children: calculation.cases.map((calculatedCase, index) => ({
							id: createdChildren[index].id,
							...allocationSummary(calculatedCase),
						})),
					},
				},
			});

			return {
				parentInvoiceCaseId: parent.id,
				rootInvoiceCaseId,
				children: createdChildren,
				replayed: false,
			};
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
	);
}

export async function splitTgemInvoiceCase(
	database: TgemInvoiceSplitDatabase,
	input: TgemInvoiceSplitServiceInput,
) {
	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			return await runSplitTransaction(database, input);
		} catch (error) {
			if (isRetryableTransactionConflict(error)) {
				if (attempt === 0) continue;
				return fail("conflict");
			}
			throw error;
		}
	}
	return fail("conflict");
}
