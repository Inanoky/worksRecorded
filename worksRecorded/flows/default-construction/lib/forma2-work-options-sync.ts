import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
import type { Forma2Position } from "@/flows/default-construction/lib/forma2-analytics";
import {
	DEFAULT_CONSTRUCTION_FORMA2_WORK_SYNC_KEY,
	type DefaultConstructionForma2WorkSyncEntry,
	type DefaultConstructionForma2WorkSyncManifest,
	getDefaultConstructionForma2WorkSyncManifest,
	normalizeForma2WorkOptionKey,
} from "@/flows/default-construction/lib/forma2-work-options-manifest";
import {
	DEFAULT_CONSTRUCTION_PRODUCTIVITY_SETTINGS_KEY,
	type DefaultConstructionWorkProductivitySetting,
	getDefaultConstructionProductivitySettings,
	setDefaultConstructionWorkDropdownOptions,
} from "@/flows/default-construction/lib/site-diary-productivity-settings";
import { compareSiteDiaryWorks } from "@/flows/default-construction/lib/site-diary-work-order";

const MAX_WORK_LENGTH = 200;

function cloneConfig(config: Record<string, any>) {
	return JSON.parse(JSON.stringify(config)) as Record<string, any>;
}

function compactText(value: unknown) {
	return String(value ?? "")
		.replace(/\s+/g, " ")
		.trim();
}

function dropdownValues(config: Record<string, any>, field: string) {
	const options = config?.[field]?.DropDownOptions;
	if (!options || typeof options !== "object") return [];
	return Array.from(
		new Set(Object.values(options).map(compactText).filter(Boolean)),
	);
}

function persistedSetting(
	setting: DefaultConstructionWorkProductivitySetting,
): DefaultConstructionWorkProductivitySetting {
	return {
		work: setting.work,
		unit: setting.unit,
		laborNormHoursPerUnit: setting.laborNormHoursPerUnit,
		hourlyCost: setting.hourlyCost ?? null,
		costCalculationMode: setting.costCalculationMode ?? "output",
	};
}

function limitedName(base: string, suffix = "") {
	return `${base.slice(0, Math.max(1, MAX_WORK_LENGTH - suffix.length)).trim()}${suffix}`;
}

export function buildDefaultConstructionForma2WorkOptionName(
	position: Forma2Position,
) {
	const code = compactText(position.code);
	const categoryName = compactText(position.categoryName);
	const name = compactText(position.name);
	const description =
		categoryName &&
		normalizeForma2WorkOptionKey(categoryName) !==
			normalizeForma2WorkOptionKey(name)
			? `${categoryName} - ${name}`
			: name || categoryName;
	return limitedName([code, description].filter(Boolean).join(" "));
}

function workCandidates(positions: Forma2Position[]) {
	const usedNames = new Set<string>();
	return positions
		.filter((position) => position.kind === "work")
		.map((position, index) => {
			const base =
				buildDefaultConstructionForma2WorkOptionName(position) ||
				limitedName(`Forma 2 darbs ${index + 1}`);
			let work = base;
			let attempt = 1;
			while (usedNames.has(normalizeForma2WorkOptionKey(work))) {
				const rowLabel = Math.max(1, Number(position.sourceRow) || index + 1);
				const suffix = ` (${rowLabel}${attempt > 1 ? `-${attempt}` : ""})`;
				work = limitedName(base, suffix);
				attempt += 1;
			}
			usedNames.add(normalizeForma2WorkOptionKey(work));
			return { position, work };
		});
}

function setDropdownValues(
	config: Record<string, any>,
	field: "Works" | "Units",
	values: string[],
) {
	const fallback = (defaultConfig as Record<string, any>)[field] ?? {
		Type: "dropdown",
		DisplayName: field,
	};
	config[field] = {
		...(config[field] ?? fallback),
		DropDownOptions: Object.fromEntries(values.map((value) => [value, value])),
	};
}

function setWorkDropdownValues(config: Record<string, any>, values: string[]) {
	setDefaultConstructionWorkDropdownOptions(config, values);
}

export function isDefaultConstructionForma2WorkSyncCurrent(
	config: Record<string, any>,
	documentId: string,
) {
	return (
		getDefaultConstructionForma2WorkSyncManifest(config)?.documentId ===
		documentId
	);
}

export function syncDefaultConstructionForma2WorkOptions(args: {
	config: Record<string, any>;
	documentId: string;
	positions: Forma2Position[];
}) {
	const config = cloneConfig(args.config);
	const oldManifest = getDefaultConstructionForma2WorkSyncManifest(config);
	const oldOwnedKeys = new Set(
		(oldManifest?.entries ?? [])
			.filter((entry) => entry.ownedByForma2)
			.map((entry) => normalizeForma2WorkOptionKey(entry.work)),
	);
	const oldEntriesByPositionId = new Map(
		(oldManifest?.entries ?? []).map((entry) => [entry.positionId, entry]),
	);
	const currentSettings = getDefaultConstructionProductivitySettings(config).works;
	const settingsByWork = new Map(
		currentSettings.map((setting) => [
			normalizeForma2WorkOptionKey(setting.work),
			setting,
		]),
	);
	const manualWorks = dropdownValues(config, "Works").filter(
		(work) => !oldOwnedKeys.has(normalizeForma2WorkOptionKey(work)),
	);
	const manualWorksByKey = new Map(
		manualWorks.map((work) => [normalizeForma2WorkOptionKey(work), work]),
	);
	const candidates = workCandidates(args.positions);
	const importedSettingsByWork = new Map<
		string,
		DefaultConstructionWorkProductivitySetting
	>();
	const entries: DefaultConstructionForma2WorkSyncEntry[] = [];
	const ownedWorks: string[] = [];

	for (const candidate of candidates) {
		const generatedKey = normalizeForma2WorkOptionKey(candidate.work);
		const existingManualWork = manualWorksByKey.get(generatedKey);
		const ownedByForma2 = !existingManualWork;
		const work = existingManualWork ?? candidate.work;
		entries.push({
			positionId: candidate.position.id,
			work,
			ownedByForma2,
		});
		if (!ownedByForma2) continue;
		ownedWorks.push(work);

		const oldEntry = oldEntriesByPositionId.get(candidate.position.id);
		const previous =
			settingsByWork.get(generatedKey) ??
			(oldEntry
				? settingsByWork.get(normalizeForma2WorkOptionKey(oldEntry.work))
				: undefined);
		const norm = Number(candidate.position.laborNormHoursPerUnit);
		const hourlyRate = Number(candidate.position.hourlyRate);
		importedSettingsByWork.set(generatedKey, {
			work,
			unit: compactText(candidate.position.unit) || previous?.unit || "",
			laborNormHoursPerUnit:
				candidate.position.laborNormHoursPerUnit != null &&
				Number.isFinite(norm) &&
				norm > 0
					? norm
					: (previous?.laborNormHoursPerUnit ?? null),
			hourlyCost:
				candidate.position.hourlyRate != null &&
				Number.isFinite(hourlyRate) &&
				hourlyRate >= 0
					? hourlyRate
					: (previous?.hourlyCost ?? null),
			costCalculationMode: previous?.costCalculationMode ?? "output",
		});
	}

	const works = [...manualWorks, ...ownedWorks].sort(compareSiteDiaryWorks);
	const settings = works.map((work) => {
		const key = normalizeForma2WorkOptionKey(work);
		return persistedSetting(
			importedSettingsByWork.get(key) ??
				settingsByWork.get(key) ?? {
					work,
					unit: "",
					laborNormHoursPerUnit: null,
					hourlyCost: null,
					costCalculationMode: "output",
				},
		);
	});
	const units = Array.from(
		new Set([
			...dropdownValues(config, "Units"),
			...candidates.map(({ position }) => compactText(position.unit)).filter(Boolean),
		]),
	);
	const manifest: DefaultConstructionForma2WorkSyncManifest = {
		version: 1,
		documentId: args.documentId,
		entries,
	};
	const otherSettings =
		config.otherSettings && typeof config.otherSettings === "object"
			? config.otherSettings
			: {};

	setWorkDropdownValues(config, works);
	setDropdownValues(config, "Units", units);
	config.otherSettings = {
		...otherSettings,
		[DEFAULT_CONSTRUCTION_PRODUCTIVITY_SETTINGS_KEY]: {
			version: 4,
			works: settings,
		},
		[DEFAULT_CONSTRUCTION_FORMA2_WORK_SYNC_KEY]: manifest,
	};

	const newOwnedKeys = new Set(
		entries
			.filter((entry) => entry.ownedByForma2)
			.map((entry) => normalizeForma2WorkOptionKey(entry.work)),
	);
	return {
		config,
		manifest,
		importedWorks: candidates.length,
		addedWorks: Array.from(newOwnedKeys).filter(
			(key) => !oldOwnedKeys.has(key),
		).length,
		removedWorks: Array.from(oldOwnedKeys).filter(
			(key) => !newOwnedKeys.has(key),
		).length,
		linkedManualWorks: entries.filter((entry) => !entry.ownedByForma2).length,
	};
}

export function removeDefaultConstructionForma2WorkOptions(
	inputConfig: Record<string, any>,
) {
	const config = cloneConfig(inputConfig);
	const manifest = getDefaultConstructionForma2WorkSyncManifest(config);
	if (!manifest) return { config, removedWorks: 0 };
	const ownedKeys = new Set(
		manifest.entries
			.filter((entry) => entry.ownedByForma2)
			.map((entry) => normalizeForma2WorkOptionKey(entry.work)),
	);
	const works = dropdownValues(config, "Works")
		.filter((work) => !ownedKeys.has(normalizeForma2WorkOptionKey(work)))
		.sort(compareSiteDiaryWorks);
	const settings = getDefaultConstructionProductivitySettings(config).works
		.filter((setting) => !ownedKeys.has(normalizeForma2WorkOptionKey(setting.work)))
		.map(persistedSetting);
	const otherSettings = { ...(config.otherSettings ?? {}) };
	delete otherSettings[DEFAULT_CONSTRUCTION_FORMA2_WORK_SYNC_KEY];
	otherSettings[DEFAULT_CONSTRUCTION_PRODUCTIVITY_SETTINGS_KEY] = {
		version: 4,
		works: settings,
	};
	setWorkDropdownValues(config, works);
	config.otherSettings = otherSettings;
	return { config, removedWorks: ownedKeys.size };
}

export function reconcileForma2WorkManifestAfterOptionsSave(
	config: Record<string, any>,
	works: DefaultConstructionWorkProductivitySetting[],
) {
	const manifest = getDefaultConstructionForma2WorkSyncManifest(config);
	if (!manifest) return null;
	const savedKeys = new Set(
		works.map((setting) => normalizeForma2WorkOptionKey(setting.work)),
	);
	for (const entry of manifest.entries) {
		if (
			entry.ownedByForma2 &&
			!savedKeys.has(normalizeForma2WorkOptionKey(entry.work))
		) {
			throw new Error(
				"Forma 2 work names cannot be renamed or deleted while the document is active",
			);
		}
	}
	return {
		...manifest,
		entries: manifest.entries.filter(
			(entry) =>
				entry.ownedByForma2 ||
				savedKeys.has(normalizeForma2WorkOptionKey(entry.work)),
		),
	};
}
