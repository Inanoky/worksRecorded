import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/db";
import {
	readVisualSections,
	sectionKey,
	VISUAL_SECTIONS_KEY,
	visualSectionSchema,
	visualSectionsSchema,
} from "./sections";
import { requireVisualAccess } from "./store";

export async function appendVisualSection(
	userId: string,
	siteId: string,
	input: unknown,
) {
	const access = await requireVisualAccess(userId, siteId);
	const label = visualSectionSchema.parse(input);
	return prisma.$transaction(async (tx) => {
		const site = await tx.site.findFirst({
			where: { id: siteId, organizationId: access.organizationId },
			select: { siteDiaryRecordsMap: true, name: true },
		});
		if (!site) throw new Error("Projekts nav atrasts.");
		const config = (site.siteDiaryRecordsMap ?? {}) as Prisma.InputJsonObject;
		const current = readVisualSections(config);
		const available = readVisualSections(config, site.name);
		if (available.some((item) => sectionKey(item) === sectionKey(label)))
			return available;
		const next = visualSectionsSchema.parse([...current, label]);
		const other =
			config.otherSettings &&
			typeof config.otherSettings === "object" &&
			!Array.isArray(config.otherSettings)
				? (config.otherSettings as Prisma.InputJsonObject)
				: {};
		const result = await tx.site.updateMany({
			where: {
				id: siteId,
				organizationId: access.organizationId,
				siteDiaryRecordsMap: {
					equals:
						site.siteDiaryRecordsMap === null
							? Prisma.DbNull
							: site.siteDiaryRecordsMap,
				},
			},
			data: {
				siteDiaryRecordsMap: {
					...config,
					otherSettings: { ...other, [VISUAL_SECTIONS_KEY]: next },
				},
			},
		});
		if (result.count !== 1)
			throw new Error(
				"Projekta opcijas ir mainītas citā logā. Atjaunojiet skatu un mēģiniet vēlreiz.",
			);
		return readVisualSections(
			{ otherSettings: { [VISUAL_SECTIONS_KEY]: next } },
			site.name,
		);
	});
}
