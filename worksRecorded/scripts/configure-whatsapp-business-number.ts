import "dotenv/config";
import { prisma } from "@/lib/utils/db";
import {
	ARCHIVE_TEXT_ONLY_MODE,
	LIMENI_CREDENTIAL_PROFILE,
	VISUAL_WORK_TASK_PURPOSE,
} from "@/lib/whatsapp-business-numbers";

function option(name: string) {
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

function required(name: string) {
	const value = option(name);
	if (!value) throw new Error(`Missing --${name}`);
	return value;
}

async function main() {
	const organizationId = required("organization-id");
	const businessPhoneNumberId = required("phone-number-id");
	const displayPhoneNumber = required("display-number").replace(/\D/g, "");
	const templateName = required("template-name");
	const templateLanguage = option("template-language") || "lv";
	const active = process.argv.includes("--activate");
	await prisma.organization.findUniqueOrThrow({
		where: { id: organizationId },
		select: { id: true },
	});
	const row = await prisma.whatsAppBusinessNumber.upsert({
		where: { businessPhoneNumberId },
		create: {
			organizationId,
			businessPhoneNumberId,
			displayPhoneNumber,
			purpose: VISUAL_WORK_TASK_PURPOSE,
			inboundMode: ARCHIVE_TEXT_ONLY_MODE,
			credentialProfile: LIMENI_CREDENTIAL_PROFILE,
			templateName,
			templateLanguage,
			active,
		},
		update: {
			organizationId,
			displayPhoneNumber,
			purpose: VISUAL_WORK_TASK_PURPOSE,
			inboundMode: ARCHIVE_TEXT_ONLY_MODE,
			credentialProfile: LIMENI_CREDENTIAL_PROFILE,
			templateName,
			templateLanguage,
			active,
		},
	});
	console.log({
		id: row.id,
		organizationId: row.organizationId,
		businessPhoneNumberId: row.businessPhoneNumberId,
		displayPhoneNumber: row.displayPhoneNumber,
		templateName: row.templateName,
		templateLanguage: row.templateLanguage,
		active: row.active,
	});
}

main()
	.catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
