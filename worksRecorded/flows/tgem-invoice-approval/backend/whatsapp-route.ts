import { createHash } from "node:crypto";
import { traceable } from "langsmith/traceable";
import { UTApi } from "uploadthing/server";
import {
	parseTgemDraftButton,
	sendTgemDraftReply,
} from "@/flows/tgem-invoice-approval/backend/draft-messages";
import {
	buildTgemInvoiceIdempotencyKey,
	isSupportedTgemInvoiceContentType,
	MAX_TGEM_INVOICE_BYTES,
} from "@/lib/tgem-invoice-approval/intake";
import { buildTgemInvoiceLangSmithConfig } from "@/lib/tgem-invoice-approval/langsmith";
import { withTgemInvoiceTraceFlush } from "@/lib/tgem-invoice-approval/tracing";
import {
	applyTgemDraftAction,
	completeTgemDraftFile,
	findTgemUploadDraft,
	reserveTgemDraftFile,
	type TgemDraftAction,
	type TgemDraftScope,
} from "@/lib/tgem-invoice-approval/upload-drafts";
import { enqueueTgemInvoiceProcessing } from "@/lib/tgem-invoice-approval/workflow-client";
import { prisma } from "@/lib/utils/db";
import { getUploadThingUfsUrl } from "@/lib/utils/uploadthing-file-url";
import {
	fetchWhatsAppMediaAsBuffer,
	getString,
} from "@/lib/utils/whatsapp-helpers/shared/helpers";
import {
	getMetaReplyContext,
	sendMessage,
} from "@/lib/utils/whatsapp-helpers/shared/sender";

const utapi = new UTApi();
const PROJECT_COMMANDS = new Set(["project", "projekts", "change", "проект"]);
const TEXT_ACTIONS: Record<string, TgemDraftAction> = {
	apstrādāt: "submit",
	apstradat: "submit",
	"tas ir viss": "submit",
	iesniegt: "submit",
	vēl: "more",
	vel: "more",
	"pievienot vēl": "more",
	kopā: "together",
	kopa: "together",
	"viena pakete": "together",
	atsevišķi: "separate",
	atseviski: "separate",
};
type Args = { from: string | null; formData: FormData; user: { id: string } };

function filename(value: string, messageId: string, contentType: string) {
	const extension =
		contentType === "application/pdf"
			? "pdf"
			: contentType === "image/png"
				? "png"
				: contentType === "image/webp"
					? "webp"
					: "jpg";
	return (
		value
			.replace(/[\\/]/g, "_")
			.split("")
			.filter(
				(character) =>
					character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
			)
			.join("")
			.trim()
			.slice(0, 180) || `whatsapp-invoice-${messageId}.${extension}`
	);
}

async function handleInternal(args: Args) {
	const user = await prisma.user.findUnique({
		where: { id: args.user.id },
		select: {
			id: true,
			organizationId: true,
			lastSelectedSiteIdforWhatsapp: true,
			organization: {
				select: {
					sites: { select: { id: true, name: true }, orderBy: { name: "asc" } },
				},
			},
		},
	});
	const context = getMetaReplyContext();
	if (!user?.organizationId || !context?.businessPhoneNumberId) {
		await sendMessage(
			args.from,
			"Neizdevās noteikt TGEM organizāciju vai WhatsApp kanālu. Lūdzu, mēģiniet vēlreiz.",
		);
		return { outcome: "missing_context" };
	}
	const projects = user.organization?.sites ?? [];
	const body = (getString(args.formData, "Body") || "").trim().toLowerCase();
	const button = parseTgemDraftButton(
		getString(args.formData, "TgemDraftButtonId") || "",
	);
	const scope: TgemDraftScope = {
		organizationId: user.organizationId,
		userId: user.id,
		siteId: user.lastSelectedSiteIdforWhatsapp ?? "",
		businessPhoneNumberId: context.businessPhoneNumberId,
		sender: args.from ?? "",
	};
	let draft = await findTgemUploadDraft(scope, button?.id);
	let project = projects.find(
		(item) => item.id === (draft?.siteId ?? scope.siteId),
	);
	if (
		PROJECT_COMMANDS.has(body) &&
		draft &&
		["collecting", "choosing"].includes(draft.status)
	) {
		await sendMessage(
			args.from,
			"Pirms projekta maiņas apstrādājiet pašreizējā melnraksta dokumentus.",
		);
		if (project) await sendTgemDraftReply(args.from, draft, project.name);
		return { outcome: "draft_project_locked" };
	}
	if (PROJECT_COMMANDS.has(body)) {
		await prisma.user.update({
			where: { id: user.id },
			data: { lastSelectedSiteIdforWhatsapp: null },
		});
		project = undefined;
	} else if (!project) {
		const selection = /^\d+$/.test(body)
			? projects[Number(body) - 1]
			: projects.length === 1
				? projects[0]
				: undefined;
		if (selection) {
			project = selection;
			await prisma.user.update({
				where: { id: user.id },
				data: { lastSelectedSiteIdforWhatsapp: selection.id },
			});
		}
	}
	if (!project) {
		await sendMessage(
			args.from,
			projects.length
				? `Izvēlieties projektu, nosūtot tā numuru:\n${projects.map((item, index) => `${index + 1} - ${item.name}`).join("\n")}`
				: "Jūsu organizācijai nav pieejamu projektu.",
		);
		return { outcome: "project_required" };
	}
	scope.siteId = project.id;
	const numMedia = Number(getString(args.formData, "NumMedia") || "0");
	const action = button?.action ?? (!numMedia ? TEXT_ACTIONS[body] : undefined);
	if (action) {
		if (!draft) {
			await sendMessage(
				args.from,
				"Nav atvērta rēķina melnraksta. Nosūtiet attēlu vai PDF dokumentu.",
			);
			return { outcome: "draft_missing" };
		}
		try {
			const result = await applyTgemDraftAction(
				scope,
				draft.id,
				button?.revision ?? draft.revision,
				action,
			);
			if (result.invoices.length) {
				for (const invoice of result.invoices) {
					if (
						["received", "failed_processing"].includes(invoice.status) &&
						invoice.documents[0]
					) {
						await enqueueTgemInvoiceProcessing({
							invoiceCaseId: invoice.id,
							documentId: invoice.documents[0].id,
						});
					}
				}
				await sendMessage(
					args.from,
					result.invoices.length === 1
						? "Dokumentu pakete iesniegta. Sāku apstrādi kā vienu rēķinu; pārējie dokumenti paliks pielikumos."
						: `Iesniegti ${result.invoices.length} atsevišķi rēķini. Sāku apstrādi.`,
				);
			} else if (result.decision === "closed") {
				await sendMessage(
					args.from,
					"Šis melnraksts jau ir aizvērts. Nosūtiet failu, lai sāktu jaunu melnrakstu.",
				);
			} else {
				if (result.decision === "uploading")
					await sendMessage(
						args.from,
						"Daži faili vēl tiek saglabāti. Kad tie būs saņemti, izvēlieties “Apstrādāt”.",
					);
				if (result.decision === "stale")
					await sendMessage(
						args.from,
						"Melnraksts ir mainījies. Lūdzu, izmantojiet jaunākās izvēles zemāk.",
					);
				await sendTgemDraftReply(args.from, result.draft, project.name);
			}
			return {
				outcome: `draft_${result.decision}`,
				siteId: project.id,
				invoiceCount: result.invoices.length,
			};
		} catch (error) {
			await sendMessage(
				args.from,
				error instanceof Error &&
					error.message === "draft_package_processor_unsupported"
					? "Pašreizējā dokumentu apstrādes konfigurācija neatbalsta vienotu paketi. Melnraksts saglabāts. Sazinieties ar administratoru vai izvēlieties “Atsevišķi”, ja tie ir atsevišķi rēķini."
					: "Neizdevās pabeigt iesniegšanu. Faili ir saglabāti; lūdzu, nospiediet to pašu iesniegšanas pogu vēlreiz.",
			);
			return { outcome: "draft_submit_failed", siteId: project.id };
		}
	}
	if (!numMedia) {
		if (draft && ["collecting", "choosing"].includes(draft.status))
			await sendTgemDraftReply(args.from, draft, project.name);
		else
			await sendMessage(
				args.from,
				`Nosūtiet rēķina attēlu vai PDF projektam “${project.name}”. Vienam rēķinam varat pievienot līdz 10 dokumentiem. Faili tiks saglabāti melnrakstā; kad viss pievienots, spiediet “Apstrādāt”.`,
			);
		return { outcome: "invoice_media_required", siteId: project.id };
	}
	if (numMedia !== 1) {
		await sendMessage(
			args.from,
			"Lūdzu, nosūtiet failus pa vienam vai parastā WhatsApp vairāku failu sūtījumā. Tie tiks pievienoti vienam melnrakstam.",
		);
		return { outcome: "unsupported_batch" };
	}
	const contentType = (getString(args.formData, "MediaContentType0") || "")
		.split(";")[0]
		.trim()
		.toLowerCase();
	const mediaUrl = getString(args.formData, "MediaUrl0");
	const messageId = getString(args.formData, "MessageId");
	if (!isSupportedTgemInvoiceContentType(contentType)) {
		await sendMessage(
			args.from,
			"Atbalstīti JPG, PNG, WebP attēli un PDF dokumenti. Melnraksts nav iesniegts.",
		);
		return { outcome: "unsupported_content_type", siteId: project.id };
	}
	if (!mediaUrl || !messageId) {
		await sendMessage(
			args.from,
			"Neizdevās saņemt failu no WhatsApp. Lūdzu, nosūtiet to vēlreiz.",
		);
		return { outcome: "missing_media", siteId: project.id };
	}
	const legacy = await prisma.tgemInvoiceCase.findUnique({
		where: {
			idempotencyKey: buildTgemInvoiceIdempotencyKey({
				organizationId: scope.organizationId,
				source: "whatsapp",
				sourceMessageId: messageId,
			}),
		},
		select: { id: true },
	});
	if (legacy) {
		await sendMessage(
			args.from,
			"Šis fails jau ir iesniegts un ir pieejams TGEM rēķinu panelī.",
		);
		return {
			outcome: "duplicate",
			invoiceCaseId: legacy.id,
			siteId: project.id,
		};
	}
	let fileId: string | undefined;
	let saved = false;
	try {
		const reserved = await reserveTgemDraftFile(scope, {
			messageId,
			contentType,
			originalFilename: filename(
				getString(args.formData, "MediaFilename0") || "",
				messageId,
				contentType,
			),
		});
		if (!reserved.upload) {
			if (["collecting", "choosing"].includes(reserved.draft.status))
				await sendTgemDraftReply(args.from, reserved.draft, project.name);
			else
				await sendMessage(
					args.from,
					"Šis fails jau ir saglabāts iepriekšējā melnrakstā.",
				);
			return { outcome: "draft_duplicate", siteId: project.id };
		}
		fileId = reserved.file.id;
		const content = await fetchWhatsAppMediaAsBuffer(mediaUrl);
		if (content.byteLength > MAX_TGEM_INVOICE_BYTES)
			throw new Error("file_too_large");
		const uploaded = await utapi.uploadFiles([
			new File([content], reserved.file.originalFilename, {
				type: contentType,
			}),
		]);
		const upload = Array.isArray(uploaded) ? uploaded[0] : uploaded;
		if (upload?.error || !upload?.data) throw new Error("upload_failed");
		const canonicalUrl = getUploadThingUfsUrl(upload.data);
		if (!canonicalUrl) throw new Error("upload_failed");
		draft = await completeTgemDraftFile(scope, fileId, {
			canonicalUrl,
			storageKey: upload.data.key,
			byteSize: content.byteLength,
			sha256: createHash("sha256").update(content).digest("hex"),
		});
		saved = true;
		if (!["collecting", "choosing"].includes(draft.status)) {
			await sendMessage(
				args.from,
				"Fails saglabāts iepriekšējā melnrakstā. Nosūtiet to vēlreiz, lai pievienotu apstrādei.",
			);
			return { outcome: "draft_closed", siteId: project.id };
		}
		await sendTgemDraftReply(args.from, draft, project.name);
		return {
			outcome: "draft_file_saved",
			siteId: project.id,
			draftId: draft.id,
		};
	} catch (error) {
		if (fileId && !saved)
			await completeTgemDraftFile(scope, fileId, null).catch(() => undefined);
		if (saved) {
			await sendMessage(
				args.from,
				"Fails ir saglabāts melnrakstā. Lai turpinātu, nosūtiet vēl vienu failu vai rakstiet “Apstrādāt”.",
			);
			return { outcome: "draft_reply_failed", siteId: project.id };
		}
		if (error instanceof Error && error.message === "draft_file_limit") {
			await sendMessage(
				args.from,
				"Vienā melnrakstā var būt ne vairāk kā 10 dokumenti. Šis fails netika pievienots. Spiediet “Apstrādāt”, lai apstrādātu saglabātos dokumentus, un pēc tam nosūtiet nākamā rēķina dokumentus.",
			);
			const current = await findTgemUploadDraft(scope);
			if (current) await sendTgemDraftReply(args.from, current, project.name);
			return { outcome: "draft_file_limit", siteId: project.id };
		}
		await sendMessage(
			args.from,
			"Failu neizdevās pievienot. Lūdzu, mēģiniet vēlreiz. Vienā melnrakstā var būt līdz 10 failiem, kopā līdz 32 MB; viens fails — līdz 16 MB. Jau saglabātie faili paliek melnrakstā.",
		);
		return { outcome: "draft_file_failed", siteId: project.id };
	}
}

const traced = traceable(handleInternal, {
	...buildTgemInvoiceLangSmithConfig({ stage: "request", source: "whatsapp" }),
	processInputs: ({ user }) => ({ userId: user.id }),
	processOutputs: (output) => ({ outcome: output.outcome }),
});

export async function handleTgemInvoiceWhatsappRoute(args: Args) {
	return withTgemInvoiceTraceFlush(() => traced(args));
}
