"use server";

import {
	applyTgemDraftAction,
	findTgemUploadDraft,
} from "@/lib/tgem-invoice-approval/upload-drafts";
import { enqueueTgemInvoiceProcessing } from "@/lib/tgem-invoice-approval/workflow-client";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

export async function submitTgemWebInvoicePackage(input: {
	draftId: string;
	mode: "together" | "separate";
}) {
	if (!["together", "separate"].includes(input.mode))
		throw new Error("Invalid submission mode");
	const user = await requireUser();
	const dbUser = await prisma.user.findUnique({
		where: { id: user.id },
		select: { organizationId: true },
	});
	if (!dbUser?.organizationId) throw new Error("Organization access required");
	const scope = {
		userId: user.id,
		organizationId: dbUser.organizationId,
		businessPhoneNumberId: "dashboard",
		sender: user.id,
		siteId: "",
	};
	const draft = await findTgemUploadDraft(scope, input.draftId);
	if (!draft || draft.source !== "dashboard")
		throw new Error("Draft access denied");
	scope.siteId = draft.siteId;
	const result = await applyTgemDraftAction(
		scope,
		draft.id,
		draft.revision,
		input.mode,
	).catch((error: unknown) => {
		if (
			error instanceof Error &&
			error.message === "draft_package_processor_unsupported"
		)
			throw new Error(
				"Vienotas dokumentu paketes apstrāde pašlaik nav pieejama. Sazinieties ar administratoru.",
			);
		throw error;
	});
	if (!result.invoices.length)
		throw new Error("Dokumenti vēl nav saglabāti. Mēģiniet iesniegt vēlreiz.");
	for (const invoice of result.invoices) {
		const document = invoice.documents[0];
		if (document && ["received", "failed_processing"].includes(invoice.status))
			await enqueueTgemInvoiceProcessing({
				invoiceCaseId: invoice.id,
				documentId: document.id,
			});
	}
	return result.invoices.map((invoice) => ({
		invoiceCaseId: invoice.id,
		documentId: invoice.documents[0]?.id,
	}));
}
