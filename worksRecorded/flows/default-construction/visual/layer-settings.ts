import { z } from "zod";
import {
	getDefaultConstructionForma2WorkSyncManifest,
	normalizeForma2WorkOptionKey,
} from "../lib/forma2-work-options-manifest";
import {
	type VisualEvidence,
	type VisualMark,
	visualLayers,
	workLayer,
} from "./model";

export const VISUAL_LAYERS_SETTINGS_KEY = "limeniVisualLayers";
const layerId = z
	.string()
	.regex(/^(sand|xps|estrich|film|thermowhite|other|custom-[a-z0-9-]{1,70})$/);
export const visualLayerSettingsSchema = z
	.object({
		version: z.literal(1),
		categories: z
			.array(
				z.object({
					id: layerId,
					label: z.string().trim().min(1).max(80),
					color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
				}),
			)
			.min(1)
			.max(60),
		works: z
			.array(
				z.object({
					work: z.string().trim().min(1).max(500),
					positionId: z.string().min(1).max(180).optional(),
					layerId,
				}),
			)
			.max(5000),
		zones: z
			.array(
				z.object({
					drawingId: z.string().min(1).max(180),
					markId: z.string().min(1).max(400),
					layerId,
				}),
			)
			.max(20000),
		redirects: z.record(layerId, layerId),
	})
	.superRefine((settings, context) => {
		const ids = new Set(settings.categories.map((c) => c.id));
		const labels = new Set(
			settings.categories.map((c) => normalizeVisualWork(c.label)),
		);
		if (
			ids.size !== settings.categories.length ||
			labels.size !== settings.categories.length
		)
			context.addIssue({
				code: "custom",
				message: "Slāņu nosaukumiem un identifikatoriem jābūt unikāliem.",
			});
		if (!ids.has("other"))
			context.addIssue({
				code: "custom",
				message: "Noklusējuma slāni nevar dzēst; to var pārdēvēt.",
			});
		for (const assignment of [...settings.works, ...settings.zones])
			if (!ids.has(assignment.layerId))
				context.addIssue({
					code: "custom",
					message: "Piesaiste norāda uz neesošu slāni.",
				});
		for (const [source, destination] of Object.entries(settings.redirects))
			if (ids.has(source) || !ids.has(destination))
				context.addIssue({
					code: "custom",
					message: "Nederīgs dzēstā slāņa aizvietojums.",
				});
		if (
			new Set(settings.works.map((w) => normalizeVisualWork(w.work))).size !==
			settings.works.length
		)
			context.addIssue({
				code: "custom",
				message: "Katram darbam drīkst būt viena slāņa piesaiste.",
			});
		if (
			new Set(
				settings.zones.map((z) => JSON.stringify([z.drawingId, z.markId])),
			).size !== settings.zones.length
		)
			context.addIssue({
				code: "custom",
				message: "Katrai zonai drīkst būt viena slāņa piesaiste.",
			});
	});

export type VisualLayerSettings = z.infer<typeof visualLayerSettingsSchema>;
export type VisualLayerConfiguration = {
	settings: VisualLayerSettings;
	workOptions: string[];
	positionIds: Record<string, string>;
};
export const normalizeVisualWork = (work: string) =>
	work.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("lv");

export function defaultVisualLayerSettings(): VisualLayerSettings {
	return {
		version: 1,
		categories: Object.entries(visualLayers).map(([id, appearance]) => ({
			id,
			...appearance,
		})),
		works: [],
		zones: [],
		redirects: {},
	};
}

export function readVisualLayerSettings(
	config: Record<string, unknown>,
): VisualLayerSettings {
	const other =
		config.otherSettings &&
		typeof config.otherSettings === "object" &&
		!Array.isArray(config.otherSettings)
			? (config.otherSettings as Record<string, unknown>)
			: {};
	const raw = other[VISUAL_LAYERS_SETTINGS_KEY];
	return raw == null
		? defaultVisualLayerSettings()
		: visualLayerSettingsSchema.parse(raw);
}

export function visualLayerPositionIds(config: Record<string, unknown>) {
	return Object.fromEntries(
		(getDefaultConstructionForma2WorkSyncManifest(config)?.entries ?? []).map(
			(entry) => [normalizeVisualWork(entry.work), entry.positionId],
		),
	);
}

export function resolveVisualWorkLayer(
	work: string,
	settings: VisualLayerSettings,
	positionIds: Record<string, string> = {},
	fallback = workLayer(work),
) {
	const key = normalizeVisualWork(work);
	const positionId =
		positionIds[key] ?? positionIds[normalizeForma2WorkOptionKey(work)];
	const assignment =
		settings.works.find((entry) => normalizeVisualWork(entry.work) === key) ??
		(positionId
			? settings.works.find((entry) => entry.positionId === positionId)
			: undefined);
	const id = assignment?.layerId ?? fallback;
	return settings.categories.some((c) => c.id === id)
		? id
		: (settings.redirects[id] ?? "other");
}

export function visualLayerStyles(settings: VisualLayerSettings) {
	return Object.fromEntries(
		settings.categories.map(({ id, label, color }) => [id, { label, color }]),
	);
}

export function projectVisualMarks(
	marks: VisualMark[],
	evidence: VisualEvidence[],
	drawingId: string,
	settings: VisualLayerSettings,
	positionIds: Record<string, string> = {},
) {
	const sources = new Map(evidence.map((e) => [e.id, e]));
	const overrides = new Map(
		settings.zones
			.filter((z) => z.drawingId === drawingId)
			.map((z) => [z.markId, z.layerId]),
	);
	return marks.map((mark) => ({
		...mark,
		layer:
			overrides.get(mark.id) ??
			resolveVisualWorkLayer(
				sources.get(mark.evidenceId)?.work ?? "",
				settings,
				positionIds,
				mark.layer,
			),
	}));
}

export function removeVisualLayer(
	settings: VisualLayerSettings,
	id: string,
	replacement: string,
) {
	if (
		id === "other" ||
		id === replacement ||
		!settings.categories.some((c) => c.id === replacement)
	)
		throw new Error("Izvēlieties citu aizvietojošo slāni.");
	return visualLayerSettingsSchema.parse({
		...settings,
		categories: settings.categories.filter((c) => c.id !== id),
		works: settings.works.map((w) =>
			w.layerId === id ? { ...w, layerId: replacement } : w,
		),
		zones: settings.zones.map((z) =>
			z.layerId === id ? { ...z, layerId: replacement } : z,
		),
		redirects: {
			...Object.fromEntries(
				Object.entries(settings.redirects).map(([from, to]) => [
					from,
					to === id ? replacement : to,
				]),
			),
			[id]: replacement,
		},
	});
}
