import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { normalizeZtcRateUnit } from "@/flows/ztc-production/lib/ztc-rate-units";
import { auditZtcMutation } from "@/flows/ztc-production/lib/ztc-record-audit";
import type { ZtcAdditionalDetail } from "./additional-detail-extraction";
import { matchZtcCanonicalEntities } from "./canonical-entity-matching";

type DetailSession = {
	id: string;
	workerId: string | null;
	siteId: string | null;
	organizationId: string | null;
	Date: Date | null;
	Date_Custom_1: Date | null;
	Location: string | null;
	Location_Custom_1: string | null;
	Works: string | null;
	Works_Custom_2: string | null;
};

function detailId(
	parentId: string,
	sourceMessageId: string | null,
	description: string,
) {
	const hash = createHash("sha256")
		.update(
			JSON.stringify([
				"ztc-additional-detail",
				parentId,
				sourceMessageId,
				description.toLocaleLowerCase("lv"),
			]),
		)
		.digest("hex");
	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function prepareZtcAdditionalDetailRows(args: {
	session: DetailSession;
	details: ZtcAdditionalDetail[];
	completedAt: Date;
	completedText?: string | null;
	sourceMessageId?: string | null;
	parentSessionId?: string | null;
}): Promise<Prisma.ZtcRecordsCreateManyInput[]> {
	const merged = new Map<string, ZtcAdditionalDetail>();
	for (const detail of args.details) {
		const description = detail.description.trim();
		if (!description)
			throw new Error("Additional detail description is missing");
		if (
			detail.quantity !== null &&
			(!Number.isFinite(detail.quantity) || detail.quantity <= 0)
		)
			throw new Error("Invalid additional-detail quantity");
		const key = description.toLocaleLowerCase("lv");
		const previous = merged.get(key);
		merged.set(key, {
			description,
			sourceText: [previous?.sourceText, detail.sourceText]
				.filter(Boolean)
				.join("; "),
			quantity: previous
				? previous.quantity === null || detail.quantity === null
					? null
					: previous.quantity + detail.quantity
				: detail.quantity,
		});
	}
	const details = [...merged.values()];
	if (!details.length) return [];
	if (!args.session.siteId || !args.session.organizationId)
		throw new Error("Additional detail has no organization/site context");
	const matched = await matchZtcCanonicalEntities({
		siteId: args.session.siteId,
		rawProjectName: args.session.Location,
		rawWorks: details.map((detail) => detail.description),
		category: "additionalDetails",
	});
	return details.map((detail, index) => {
		const match = matched.works.find((match) => match.rawIndex === index);
		const rate = match?.rate ?? null;
		const work = rate?.task?.trim() || detail.description;
		const unit = normalizeZtcRateUnit(rate?.unit ?? "gab", "gab");
		if (
			unit === "gab" &&
			detail.quantity !== null &&
			!Number.isInteger(detail.quantity)
		)
			throw new Error("Piece quantity must be a whole number");
		const projectName = matched.project?.name ?? args.session.Location;
		return {
			id: detailId(
				args.session.id,
				args.sourceMessageId ?? null,
				detail.description,
			),
			workerId: args.session.workerId,
			siteId: args.session.siteId,
			organizationId: args.session.organizationId,
			Date: args.completedAt,
			Date_Custom_1:
				args.session.Date_Custom_1 ?? args.session.Date ?? args.completedAt,
			Date_Custom_2: args.completedAt,
			Location: projectName,
			Location_Custom_1: args.session.Location_Custom_1,
			Works_Custom_1: "Papilddetāļas",
			Works: work,
			Location_Custom_2: rate?.rate ?? null,
			Works_Custom_2: args.session.Works_Custom_2,
			Units: unit,
			Amounts: detail.quantity,
			TimeInvolved: 0,
			Comments: args.completedText?.trim()
				? `Papilddetāļas: ${args.completedText.trim()}`
				: "Papilddetāļas",
			originalUserComment: args.completedText?.trim() ?? null,
			Photos: [],
			Comments_Custom_2: JSON.stringify({
				type: "ztc_additional_detail",
				parentSessionId:
					args.parentSessionId === undefined
						? args.session.id
						: args.parentSessionId,
				projectName,
				elementName: args.session.Location_Custom_1,
				mainWork: args.session.Works,
				extractedWork: detail.description,
				matchedRateTask: rate?.task ?? null,
				sourceMessageId: args.sourceMessageId ?? null,
				sourceText: detail.sourceText ?? null,
				ztcRateMatch: {
					task: rate?.task ?? null,
					work,
					source: match?.source ?? "raw",
					reason: match?.reason,
				},
				ztcAdditionalDetailsReview: {
					required: detail.quantity === null || !rate,
					quantityRequired: detail.quantity === null,
					rateRequired: !rate,
				},
			}),
		};
	});
}

export function persistZtcSessionCompletion(args: {
	recordId: string;
	organizationId: string | null;
	data: Prisma.ZtcRecordsUpdateManyMutationInput;
	details: Prisma.ZtcRecordsCreateManyInput[];
}) {
	return auditZtcMutation(
		"completeSession",
		async (tx) => {
			const result = await tx.ztcRecords.updateMany({
				where: {
					id: args.recordId,
					organizationId: args.organizationId,
					Date_Custom_2: null,
				},
				data: args.data,
			});
			const record = await tx.ztcRecords.findUniqueOrThrow({
				where: { id: args.recordId },
			});
			if (record.organizationId !== args.organizationId)
				throw new Error("Work session organization changed");
			if (result.count !== 1) {
				if (!record.Date_Custom_2)
					throw new Error("Work session changed before completion");
				return { record, newlyCompleted: false };
			}
			if (args.details.length)
				await tx.ztcRecords.createMany({ data: args.details });
			return { record, newlyCompleted: true };
		},
		{ details: { additionalDetailCount: args.details.length } },
	);
}

export function persistZtcStandaloneAdditionalDetails(
	session: DetailSession,
	details: Prisma.ZtcRecordsCreateManyInput[],
) {
	return auditZtcMutation(
		"saveStandaloneAdditionalDetails",
		async (tx) => {
			await tx.$queryRaw`SELECT id FROM public."ZTCrecords" WHERE id = ${session.id} FOR UPDATE`;
			const current = await tx.ztcRecords.findUniqueOrThrow({
				where: { id: session.id },
			});
			if (
				current.organizationId !== session.organizationId ||
				current.siteId !== session.siteId ||
				current.Location !== session.Location ||
				current.Location_Custom_1 !== session.Location_Custom_1
			) {
				throw new Error("Additional-detail drawing context changed");
			}
			const sourceIds = new Set(
				details.map(
					(row) =>
						JSON.parse(String(row.Comments_Custom_2)).sourceMessageId as
							| string
							| null,
				),
			);
			if (sourceIds.size !== 1 || ![...sourceIds][0])
				throw new Error(
					"Standalone detail report requires a source message ID",
				);
			const sourceId = [...sourceIds][0];
			const existing = await tx.ztcRecords.findMany({
				where: {
					organizationId: session.organizationId,
					workerId: session.workerId,
					Comments_Custom_2: { contains: JSON.stringify(sourceId) },
				},
				select: { Comments_Custom_2: true },
			});
			if (
				existing.some(
					(row) =>
						JSON.parse(row.Comments_Custom_2 ?? "{}").sourceMessageId ===
						sourceId,
				)
			)
				return { count: 0 };
			return tx.ztcRecords.createMany({ data: details, skipDuplicates: true });
		},
		{ details: { additionalDetailCount: details.length } },
	);
}
