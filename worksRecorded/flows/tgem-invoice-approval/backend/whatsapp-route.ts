import { createHash } from "node:crypto";
import { UTApi } from "uploadthing/server";
import { createTgemInvoiceCaseRecord } from "@/lib/tgem-invoice-approval/create-case";
import { buildTgemInvoiceIdempotencyKey } from "@/lib/tgem-invoice-approval/intake";
import { processTgemInvoiceCase } from "@/lib/tgem-invoice-approval/process-case";
import { prisma } from "@/lib/utils/db";
import { getUploadThingUfsUrl } from "@/lib/utils/uploadthing-file-url";
import {
	fetchWhatsAppMediaAsBuffer,
	getString,
} from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage } from "@/lib/utils/whatsapp-helpers/shared/sender";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";

const utapi = new UTApi();
const MAX_TGEM_WHATSAPP_INVOICE_BYTES = 16 * 1024 * 1024;
const SUPPORTED_TGEM_WHATSAPP_CONTENT_TYPES = new Set([
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
]);
const PROJECT_SELECTION_COMMANDS = new Set([
	"change",
	"project",
	"projekts",
	"проект",
]);

type TgemWhatsappLanguage = "lv" | "en" | "ru";

const COPY = {
	lv: {
		chooseProject: "Izvēlieties projektu, nosūtot tā numuru:",
		noProjects: "Jūsu organizācijai nav pieejamu projektu.",
		projectSelected: (name: string) =>
			`Projekts “${name}” ir izvēlēts. Tagad nosūtiet rēķina attēlu vai PDF dokumentu.`,
		instructions: (name: string) =>
			`Nosūtiet rēķina JPG, PNG, WebP attēlu vai PDF dokumentu projektam “${name}”. Lai mainītu projektu, rakstiet “Projekts”.`,
		unsupported:
			"Šis faila formāts netiek atbalstīts. Nosūtiet rēķinu kā JPG, PNG, WebP attēlu vai PDF dokumentu. Word dokumenti pašlaik netiek pieņemti.",
		missingMedia:
			"Neizdevās saņemt rēķina failu no WhatsApp. Lūdzu, mēģiniet vēlreiz.",
		tooLarge:
			"Rēķina fails ir lielāks par 16 MB. Lūdzu, nosūtiet mazāku failu.",
		processing: (name: string) =>
			`Rēķins projektam “${name}” ir saņemts. Sāku dokumenta apstrādi.`,
		ready:
			"Rēķins ir saglabāts un apstrādāts. Tas ir pieejams TGEM rēķinu panelī.",
		readyWithWarnings:
			"Rēķins ir saglabāts un apstrādāts, bet dažiem laukiem nepieciešama pārbaude TGEM rēķinu panelī.",
		alreadyReceived:
			"Šis rēķins jau ir saņemts un ir pieejams TGEM rēķinu panelī.",
		intakeFailed:
			"Rēķinu neizdevās saglabāt. Lūdzu, mēģiniet vēlreiz vai augšupielādējiet to TGEM rēķinu panelī.",
		failed:
			"Rēķins tika saglabāts, bet automātiskā apstrāde neizdevās. Pārbaudiet to TGEM rēķinu panelī.",
	},
	en: {
		chooseProject: "Choose a project by sending its number:",
		noProjects: "Your organization has no available projects.",
		projectSelected: (name: string) =>
			`Project “${name}” is selected. You can now send an invoice image or PDF document.`,
		instructions: (name: string) =>
			`Send a JPG, PNG, WebP, or PDF invoice for project “${name}”. To change the project, send “Project”.`,
		unsupported:
			"This file format is not supported. Send the invoice as a JPG, PNG, WebP, or PDF document. Word documents are not currently accepted.",
		missingMedia:
			"The invoice file could not be retrieved from WhatsApp. Please try again.",
		tooLarge:
			"The invoice file is larger than 16 MB. Please send a smaller file.",
		processing: (name: string) =>
			`The invoice for project “${name}” was received. Document processing has started.`,
		ready:
			"The invoice was saved and processed. It is available in the TGEM invoice dashboard.",
		readyWithWarnings:
			"The invoice was saved and processed, but some fields need review in the TGEM invoice dashboard.",
		alreadyReceived:
			"This invoice was already received and is available in the TGEM invoice dashboard.",
		intakeFailed:
			"The invoice could not be saved. Please try again or upload it in the TGEM invoice dashboard.",
		failed:
			"The invoice was saved, but automatic processing failed. Review it in the TGEM invoice dashboard.",
	},
	ru: {
		chooseProject: "Выберите проект, отправив его номер:",
		noProjects: "В вашей организации нет доступных проектов.",
		projectSelected: (name: string) =>
			`Выбран проект «${name}». Теперь отправьте изображение счета или PDF-документ.`,
		instructions: (name: string) =>
			`Отправьте счет в формате JPG, PNG, WebP или PDF для проекта «${name}». Чтобы изменить проект, напишите «Проект».`,
		unsupported:
			"Этот формат файла не поддерживается. Отправьте счет как JPG, PNG, WebP или PDF. Документы Word пока не принимаются.",
		missingMedia:
			"Не удалось получить файл счета из WhatsApp. Попробуйте еще раз.",
		tooLarge:
			"Размер файла счета превышает 16 МБ. Отправьте файл меньшего размера.",
		processing: (name: string) =>
			`Счет для проекта «${name}» получен. Начинаю обработку документа.`,
		ready: "Счет сохранен и обработан. Он доступен в панели счетов TGEM.",
		readyWithWarnings:
			"Счет сохранен и обработан, но некоторые поля нужно проверить в панели счетов TGEM.",
		alreadyReceived: "Этот счет уже получен и доступен в панели счетов TGEM.",
		intakeFailed:
			"Не удалось сохранить счет. Попробуйте еще раз или загрузите его в панели счетов TGEM.",
		failed:
			"Счет сохранен, но автоматическая обработка не удалась. Проверьте его в панели счетов TGEM.",
	},
} as const;

function normalizeLanguage(language?: string | null): TgemWhatsappLanguage {
	if (language === "en" || language === "ru") return language;
	return "lv";
}

async function sendProcessingMessage(to: string | null, message: string) {
	try {
		await sendMessage(to, message);
	} catch (error) {
		console.error("TGEM WhatsApp processing acknowledgement failed", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

function buildProjectPrompt(
	language: TgemWhatsappLanguage,
	projects: Array<{ id: string; name: string }>,
) {
	if (projects.length === 0) return COPY[language].noProjects;
	return `${COPY[language].chooseProject}\n${projects
		.map((project, index) => `${index + 1} - ${project.name}`)
		.join("\n")}`;
}

function extensionForContentType(contentType: string) {
	if (contentType === "application/pdf") return "pdf";
	if (contentType === "image/png") return "png";
	if (contentType === "image/webp") return "webp";
	return "jpg";
}

function normalizeFilename(
	filename: string,
	messageId: string,
	contentType: string,
) {
	const safeFilename = Array.from(filename.trim().replace(/[\\/]/g, "_"))
		.filter((character) => {
			const code = character.charCodeAt(0);
			return code >= 32 && code !== 127;
		})
		.join("")
		.slice(0, 180);
	if (safeFilename) return safeFilename;
	return `whatsapp-invoice-${messageId}.${extensionForContentType(contentType)}`;
}

export async function handleTgemInvoiceWhatsappRoute(args: {
	from: string | null;
	formData: FormData;
	user: { id: string };
}) {
	const language = normalizeLanguage(
		await getOrganizationLanguageByUserId(args.user.id),
	);
	const copy = COPY[language];
	const user = await prisma.user.findUnique({
		where: { id: args.user.id },
		select: {
			id: true,
			organizationId: true,
			lastSelectedSiteIdforWhatsapp: true,
			organization: {
				select: {
					sites: {
						select: { id: true, name: true },
						orderBy: { name: "asc" },
					},
				},
			},
		},
	});

	if (!user?.organizationId) {
		await sendMessage(args.from, copy.intakeFailed);
		return;
	}

	const projects = user.organization?.sites ?? [];
	const body = (getString(args.formData, "Body") || "").trim();
	const normalizedBody = body.toLowerCase();
	const selectedProject = projects.find(
		(project) => project.id === user.lastSelectedSiteIdforWhatsapp,
	);

	if (PROJECT_SELECTION_COMMANDS.has(normalizedBody)) {
		await prisma.user.update({
			where: { id: user.id },
			data: { lastSelectedSiteIdforWhatsapp: null },
		});
		await sendMessage(args.from, buildProjectPrompt(language, projects));
		return;
	}

	if (!selectedProject) {
		const selection = Number.parseInt(body, 10);
		const project = Number.isInteger(selection)
			? projects[selection - 1]
			: undefined;
		if (project) {
			await prisma.user.update({
				where: { id: user.id },
				data: { lastSelectedSiteIdforWhatsapp: project.id },
			});
			await sendMessage(args.from, copy.projectSelected(project.name));
			return;
		}

		await sendMessage(args.from, buildProjectPrompt(language, projects));
		return;
	}

	const numMedia = Number.parseInt(
		getString(args.formData, "NumMedia") || "0",
		10,
	);
	if (!Number.isFinite(numMedia) || numMedia < 1) {
		await sendMessage(args.from, copy.instructions(selectedProject.name));
		return;
	}

	const contentType = (getString(args.formData, "MediaContentType0") || "")
		.split(";")[0]
		.trim()
		.toLowerCase();
	if (!SUPPORTED_TGEM_WHATSAPP_CONTENT_TYPES.has(contentType)) {
		await sendMessage(args.from, copy.unsupported);
		return;
	}

	const mediaUrl = getString(args.formData, "MediaUrl0");
	const messageId = getString(args.formData, "MessageId");
	if (!mediaUrl || !messageId) {
		await sendMessage(args.from, copy.missingMedia);
		return;
	}
	const idempotencyKey = buildTgemInvoiceIdempotencyKey({
		organizationId: user.organizationId,
		source: "whatsapp",
		sourceMessageId: messageId,
	});
	const existingInvoice = await prisma.tgemInvoiceCase.findUnique({
		where: { idempotencyKey },
		select: { id: true },
	});
	if (existingInvoice) {
		await sendMessage(args.from, copy.alreadyReceived);
		return;
	}

	let invoicePersisted = false;
	try {
		const content = await fetchWhatsAppMediaAsBuffer(mediaUrl);
		if (content.byteLength > MAX_TGEM_WHATSAPP_INVOICE_BYTES) {
			await sendMessage(args.from, copy.tooLarge);
			return;
		}

		const originalFilename = normalizeFilename(
			getString(args.formData, "MediaFilename0") || "",
			messageId,
			contentType,
		);
		const file = new File([content], originalFilename, { type: contentType });
		const uploaded = await utapi.uploadFiles([file]);
		const upload = Array.isArray(uploaded) ? uploaded[0] : uploaded;
		if (upload?.error || !upload?.data) {
			throw new Error(upload?.error?.message || "Invoice upload failed");
		}

		const ufsUrl = getUploadThingUfsUrl(upload.data);
		if (!ufsUrl) {
			throw new Error("Invoice upload completed without a permanent ufsUrl");
		}

		const invoiceCase = await createTgemInvoiceCaseRecord(prisma, {
			organizationId: user.organizationId,
			siteId: selectedProject.id,
			submittedByUserId: user.id,
			source: "whatsapp",
			sourceMessageId: messageId,
			sourceSender: args.from,
			storageFile: { ufsUrl },
			storageKey: upload.data.key,
			originalFilename,
			contentType,
			byteSize: content.byteLength,
			sha256: createHash("sha256").update(content).digest("hex"),
		});
		invoicePersisted = true;
		const document = invoiceCase.documents[0];
		if (!document) {
			throw new Error("Invoice document was not created");
		}

		if (invoiceCase.status !== "received") {
			await sendMessage(args.from, copy.alreadyReceived);
			return;
		}

		await sendProcessingMessage(
			args.from,
			copy.processing(selectedProject.name),
		);
		const result = await processTgemInvoiceCase({
			invoiceCaseId: invoiceCase.id,
			documentId: document.id,
			organizationId: user.organizationId,
			actorUserId: user.id,
			actorType: "whatsapp",
			content,
			contentType,
		});
		await sendProcessingMessage(
			args.from,
			result.warningCount > 0 ? copy.readyWithWarnings : copy.ready,
		);
	} catch (error) {
		console.error("TGEM WhatsApp invoice processing failed", {
			messageId,
			userId: user.id,
			projectId: selectedProject.id,
			error: error instanceof Error ? error.message : String(error),
		});
		await sendMessage(
			args.from,
			invoicePersisted ? copy.failed : copy.intakeFailed,
		);
	}
}
