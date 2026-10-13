import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/db";
import {
	readVisualLayerSettings,
	VISUAL_LAYERS_SETTINGS_KEY,
	visualLayerSettingsSchema,
} from "./layer-settings";
import { requireVisualAccess } from "./store";

export async function persistVisualLayers(
	userId: string,
	siteId: string,
	input: unknown,
	expected: unknown,
) {
	const access = await requireVisualAccess(userId, siteId);
	const settings = visualLayerSettingsSchema.parse(input);
	const previous = visualLayerSettingsSchema.parse(expected);
	for (const category of previous.categories)
		if (
			!settings.categories.some((c) => c.id === category.id) &&
			!settings.redirects[category.id]
		)
			throw new Error("Dzēstajam slānim jānorāda aizvietojums.");
	for (const id of Object.keys(previous.redirects))
		if (
			!settings.redirects[id] &&
			!settings.categories.some((c) => c.id === id)
		)
			throw new Error("Iepriekšējo slāņu aizvietojumi jāsaglabā.");
	return prisma.$transaction(async (tx) => {
		const site = await tx.site.findFirst({
			where: { id: siteId, organizationId: access.organizationId },
			select: { siteDiaryRecordsMap: true },
		});
		if (!site) throw new Error("Projekts nav atrasts.");
		const config = (site.siteDiaryRecordsMap ?? {}) as Prisma.InputJsonObject;
		const otherSettings =
			config.otherSettings &&
			typeof config.otherSettings === "object" &&
			!Array.isArray(config.otherSettings)
				? (config.otherSettings as Prisma.InputJsonObject)
				: {};
		if (
			JSON.stringify(readVisualLayerSettings(config)) !==
			JSON.stringify(previous)
		)
			throw new Error(
				"Slāņi ir mainīti citā logā. Atjaunojiet skatu un mēģiniet vēlreiz.",
			);
		const result = await tx.site.updateMany({
			where: {
				id: siteId,
				organizationId: access.organizationId,
				siteDiaryRecordsMap:
					site.siteDiaryRecordsMap === null
						? { equals: Prisma.DbNull }
						: { equals: site.siteDiaryRecordsMap },
			},
			data: {
				siteDiaryRecordsMap: {
					...config,
					otherSettings: {
						...otherSettings,
						[VISUAL_LAYERS_SETTINGS_KEY]: settings,
					},
				},
			},
		});
		if (result.count !== 1)
			throw new Error(
				"Projekta iestatījumi ir mainīti. Atjaunojiet skatu un mēģiniet vēlreiz.",
			);
		return settings;
	});
}
