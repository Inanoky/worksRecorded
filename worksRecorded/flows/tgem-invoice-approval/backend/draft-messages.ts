import { TGEM_DRAFT_MAX_FILES } from "@/lib/tgem-invoice-approval/draft-limits";
import type {
	TgemDraftAction,
	TgemUploadDraft,
} from "@/lib/tgem-invoice-approval/upload-drafts";
import { sendMetaGraphMessage } from "@/lib/utils/whatsapp-helpers/meta/sender";
import {
	getMetaReplyContext,
	sendMessage,
} from "@/lib/utils/whatsapp-helpers/shared/sender";

export function tgemDraftReply(draft: TgemUploadDraft, projectName: string) {
	const count = draft.files.filter((file) => file.status === "ready").length;
	const pending = draft.files.filter(
		(file) => file.status === "uploading",
	).length;
	const atLimit = count + pending >= TGEM_DRAFT_MAX_FILES;
	const text = [
		`Projekts: “${projectName.slice(0, 200)}”.\nSaglabāti dokumenti: ${count}/${TGEM_DRAFT_MAX_FILES}.`,
		pending
			? `Vēl tiek ${pending === 1 ? "saglabāts 1 dokuments" : `saglabāti ${pending} dokumenti`}. Kad visi būs saņemti, varēsiet sākt apstrādi.`
			: "Ja viss pievienots, spiediet “Apstrādāt”.",
		atLimit
			? `Sasniegts ${TGEM_DRAFT_MAX_FILES} dokumentu limits. Spiediet “Apstrādāt”, pirms sūtāt nākamā rēķina dokumentus.`
			: "Lai pievienotu vēl kādu attēlu vai PDF šim pašam rēķinam, vienkārši nosūtiet nākamo failu.",
		count > 1
			? "“Apstrādāt” — visi dokumenti kopā kā viens rēķins. “Katru atsevišķi” — katrs dokuments kā atsevišķs rēķins. Apstrāde vēl nav sākta."
			: "Apstrāde vēl nav sākta.",
	].join("\n\n");
	const buttons: Array<{ action: TgemDraftAction; title: string }> = [];
	if (count && !pending) buttons.push({ action: "submit", title: "Apstrādāt" });
	if (count > 1 && !pending)
		buttons.push({ action: "separate", title: "Katru atsevišķi" });
	return {
		text,
		buttons: buttons.map(({ action, title }) => ({
			id: `tgem:${draft.id}:${draft.revision}:${action}`,
			title,
		})),
	};
}

export function parseTgemDraftButton(value: string) {
	const match =
		/^tgem:([a-f0-9-]{36}):(\d+):(submit|more|together|separate)$/.exec(value);
	if (!match || !Number.isSafeInteger(Number(match[2]))) return null;
	return {
		id: match[1],
		revision: Number(match[2]),
		action: match[3] as TgemDraftAction,
	};
}

export async function sendTgemDraftReply(
	to: string | null,
	draft: TgemUploadDraft,
	projectName: string,
) {
	const reply = tgemDraftReply(draft, projectName);
	const context = getMetaReplyContext();
	if (!context || !to) return;
	if (!reply.buttons.length) {
		await sendMessage(to, reply.text);
		return;
	}
	try {
		await sendMetaGraphMessage({
			businessPhoneNumberId: context.businessPhoneNumberId,
			recipient: to,
			body: {
				type: "interactive",
				interactive: {
					type: "button",
					body: { text: reply.text },
					action: {
						buttons: reply.buttons.map((reply) => ({ type: "reply", reply })),
					},
				},
			},
		});
	} catch (error) {
		const errorCode =
			error instanceof Error
				? /"code"\s*:\s*(\d+)/.exec(error.message)?.[1]
				: undefined;
		console.warn("TGEM draft reply buttons unavailable", {
			draftId: draft.id,
			errorCode: errorCode ?? null,
		});
		await sendMessage(
			to,
			`${reply.text}\n\nVarat arī rakstīt: ${draft.files.filter((file) => file.status === "ready").length > 1 ? "Apstrādāt vai Katru atsevišķi" : "Apstrādāt"}.`,
		);
	}
}
