import { sendMessage } from "@/lib/utils/whatsapp-helpers/shared/sender";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";

function getDashboardUploadMessage(language?: string | null) {
	if (language === "ru") {
		return "Загрузка счетов через WhatsApp пока недоступна. Пожалуйста, загрузите счет на панели TGEM.";
	}

	if (language === "en") {
		return "WhatsApp invoice upload is not available yet. Please upload the invoice in the TGEM dashboard.";
	}

	return "Rēķinu augšupielāde WhatsApp vēl nav pieejama. Lūdzu, augšupielādējiet rēķinu TGEM panelī.";
}

export async function handleTgemInvoiceWhatsappRoute(args: {
	from: string | null;
	formData: FormData;
	user: { id: string };
}) {
	const language = await getOrganizationLanguageByUserId(args.user.id);
	await sendMessage(args.from, getDashboardUploadMessage(language));
}
