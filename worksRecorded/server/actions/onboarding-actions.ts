"use server";
//nwa
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { updateOrganizationLanguage } from "@/server/actions/shared-actions";
import {
	readTourFlags,
	sendFirstProjectWelcomeTemplateForUserIfNeeded,
} from "@/server/onboarding/send-first-project-welcome-template";

export async function completeOnboardingLanguage(language: "en" | "lv") {
	const user = await requireUser();

	await updateOrganizationLanguage(language);

	const dbUser = await prisma.user.findUnique({
		where: { id: user.id },
		select: { userTour: true },
	});

	const current = readTourFlags(dbUser?.userTour);

	await prisma.user.update({
		where: { id: user.id },
		data: {
			userTour: {
				...current,
				onboardingLanguageSelected: true,
			},
		},
	});

	return { ok: true };
}

export async function sendFirstProjectWelcomeTemplateIfNeeded(args: {
	siteId: string;
	projectName: string;
}) {
	const user = await requireUser();
	return sendFirstProjectWelcomeTemplateForUserIfNeeded({
		userId: user.id,
		siteId: args.siteId,
		projectName: args.projectName,
	});
}
