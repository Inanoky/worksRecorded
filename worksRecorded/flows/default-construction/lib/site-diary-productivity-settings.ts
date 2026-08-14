import { getDefaultConstructionForma2SourceByWork } from "./forma2-work-options-manifest";
import { compareSiteDiaryWorks } from "./site-diary-work-order";

export const DEFAULT_CONSTRUCTION_PRODUCTIVITY_SETTINGS_KEY =
  "defaultConstructionProductivity";

export const DEFAULT_CONSTRUCTION_SYSTEM_WORKS = [
  "Uzkopšanas darbi",
  "Elektroinstalācijas darbi",
  "Santehnikas darbi",
  "Apkures sistēmas un ventilācijas darbi",
  "Materiālu piegāde",
  "Kavēšanās",
  "Papildu darbi",
  "Piezīmes",
] as const;

export type DefaultConstructionWorkCostMode = "hourly" | "output";

export type DefaultConstructionWorkSource =
  | {
      type: "forma2";
      documentId: string;
      positionId: string;
      ownedByForma2: boolean;
    }
  | {
      type: "systemDefault";
      locked: true;
    };

export type DefaultConstructionWorkProductivitySetting = {
  work: string;
  unit: string;
  laborNormHoursPerUnit: number | null;
  hourlyCost?: number | null;
  costCalculationMode?: DefaultConstructionWorkCostMode;
  source?: DefaultConstructionWorkSource;
};

export type DefaultConstructionProductivitySettings = {
  version: 4;
  works: DefaultConstructionWorkProductivitySetting[];
};

const normalizedKey = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase("lv");

function defaultSystemWorkByKey() {
  return new Map(
    DEFAULT_CONSTRUCTION_SYSTEM_WORKS.map((work) => [normalizedKey(work), work]),
  );
}

export function withDefaultConstructionSystemWorks(
  config: Record<string, any>,
) {
  const currentWorks = readDropdownOptions(config, "Works");
  const defaultWorksByKey = defaultSystemWorkByKey();
  const worksByKey = new Map<string, string>();

  for (const work of currentWorks) {
    const key = normalizedKey(work);
    worksByKey.set(key, defaultWorksByKey.get(key) ?? work);
  }
  for (const work of DEFAULT_CONSTRUCTION_SYSTEM_WORKS) {
    worksByKey.set(normalizedKey(work), work);
  }

  return Array.from(worksByKey.values()).sort(compareSiteDiaryWorks);
}

export function setDefaultConstructionWorkDropdownOptions(
  config: Record<string, any>,
  works: string[],
) {
  config.Works = {
    ...(config.Works ?? {
      Type: "dropdown",
      DisplayName: "Works",
    }),
    DropDownOptions: Object.fromEntries(
      withDefaultConstructionSystemWorks({
        ...config,
        Works: {
          ...(config.Works ?? {}),
          DropDownOptions: Object.fromEntries(works.map((work) => [work, work])),
        },
      }).map((work) => [work, work]),
    ),
  };
}

export function getDefaultConstructionSystemWorkSourceByWork() {
  return new Map(
    DEFAULT_CONSTRUCTION_SYSTEM_WORKS.map((work) => [
      normalizedKey(work),
      { type: "systemDefault" as const, locked: true as const },
    ]),
  );
}

export function assertDefaultConstructionSystemWorksPreserved(
  works: DefaultConstructionWorkProductivitySetting[],
) {
  const savedKeys = new Set(works.map((setting) => normalizedKey(setting.work)));
  for (const work of DEFAULT_CONSTRUCTION_SYSTEM_WORKS) {
    if (!savedKeys.has(normalizedKey(work))) {
      throw new Error("Default work names cannot be renamed or deleted");
    }
  }
}

function readDropdownOptions(
  config: Record<string, any>,
  field: string,
): string[] {
  const options = config?.[field]?.DropDownOptions;
  if (!options || typeof options !== "object") return [];

  return Array.from(
    new Set(
      Object.values(options)
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function readPositiveNorm(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readNonNegativeCost(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function readCostCalculationMode(
  value: unknown,
): DefaultConstructionWorkCostMode {
  return value === "hourly" ? "hourly" : "output";
}

function readSavedCostCalculationMode(
  value: unknown,
  settingsVersion: unknown,
): DefaultConstructionWorkCostMode {
  // Version 3 briefly used the inverse checkbox meaning. Swap its explicit
  // values so the visible checkbox choice stays unchanged after the correction.
  if (Number(settingsVersion) === 3) {
    return value === "output" ? "hourly" : "output";
  }
  return readCostCalculationMode(value);
}

function readFiniteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateDefaultConstructionWorkCost(args: {
  setting?: DefaultConstructionWorkProductivitySetting | null;
  unit?: string | null;
  amount?: number | null;
  hours?: number | null;
}) {
  const mode = readCostCalculationMode(args.setting?.costCalculationMode);
  const laborNormHoursPerUnit = readPositiveNorm(
    args.setting?.laborNormHoursPerUnit,
  );
  const hourlyRate = readNonNegativeCost(args.setting?.hourlyCost);
  const unitRate =
    laborNormHoursPerUnit != null && hourlyRate != null
      ? laborNormHoursPerUnit * hourlyRate
      : null;
  const amount = readFiniteNumber(args.amount);
  const hours = readFiniteNumber(args.hours);
  const configuredUnit = String(args.setting?.unit ?? "").trim();
  const recordUnit = String(args.unit ?? "").trim();
  const unitMatches =
    Boolean(configuredUnit) &&
    normalizedKey(configuredUnit) === normalizedKey(recordUnit);
  const actualCost =
    mode === "output"
      ? unitMatches && amount != null && unitRate != null
        ? amount * unitRate
        : null
      : hours != null && hourlyRate != null
        ? hours * hourlyRate
        : null;

  return {
    mode,
    laborNormHoursPerUnit,
    hourlyRate,
    unitRate,
    unitMatches,
    actualCost,
  };
}

export function getDefaultConstructionProductivitySettings(
  config: Record<string, any>,
): DefaultConstructionProductivitySettings {
  const rawSettings =
    config?.otherSettings?.[DEFAULT_CONSTRUCTION_PRODUCTIVITY_SETTINGS_KEY];
  const rawWorks = Array.isArray(rawSettings?.works) ? rawSettings.works : [];
  const forma2SourceByWork = getDefaultConstructionForma2SourceByWork(config);
  const systemSourceByWork = getDefaultConstructionSystemWorkSourceByWork();
  const savedByWork = new Map<
    string,
    DefaultConstructionWorkProductivitySetting
  >();

  for (const raw of rawWorks) {
    const work = String(raw?.work ?? "").trim();
    if (!work) continue;
    savedByWork.set(normalizedKey(work), {
      work,
      unit: String(raw?.unit ?? "").trim(),
      laborNormHoursPerUnit: readPositiveNorm(raw?.laborNormHoursPerUnit),
      hourlyCost: readNonNegativeCost(raw?.hourlyCost),
      costCalculationMode: readSavedCostCalculationMode(
        raw?.costCalculationMode,
        rawSettings?.version,
      ),
    });
  }

  const dropdownWorks = withDefaultConstructionSystemWorks(config);
  const works = dropdownWorks.map((work) => {
    const saved = savedByWork.get(normalizedKey(work));
    return {
      work,
      unit: saved?.unit ?? "",
      laborNormHoursPerUnit: saved?.laborNormHoursPerUnit ?? null,
      hourlyCost: saved?.hourlyCost ?? null,
      costCalculationMode: saved?.costCalculationMode ?? "output",
      source:
        systemSourceByWork.get(normalizedKey(work)) ??
        forma2SourceByWork.get(normalizedKey(work)),
    };
  });

  return { version: 4, works };
}

export function getDefaultConstructionOptionValues(
  config: Record<string, any>,
) {
  return {
    locations: readDropdownOptions(config, "Location"),
    units: readDropdownOptions(config, "Units"),
    productivity: getDefaultConstructionProductivitySettings(config),
  };
}

export function normalizeDefaultConstructionWorkSettings(
  input: DefaultConstructionWorkProductivitySetting[],
): DefaultConstructionWorkProductivitySetting[] {
  const seen = new Set<string>();
  const result: DefaultConstructionWorkProductivitySetting[] = [];

  for (const row of input) {
    const work = String(row?.work ?? "").trim();
    const unit = String(row?.unit ?? "").trim();
    if (!work) throw new Error("Work name cannot be empty");
    if (work.length > 200)
      throw new Error("Work name must be 200 characters or less");

    const key = normalizedKey(work);
    if (seen.has(key)) throw new Error(`Work already exists: ${work}`);
    seen.add(key);

    const norm = readPositiveNorm(row?.laborNormHoursPerUnit);
    if (row?.laborNormHoursPerUnit != null && norm == null) {
      throw new Error(`Time norm must be greater than zero for: ${work}`);
    }
    if (norm != null && !unit) {
      throw new Error(`Select a unit for the time norm: ${work}`);
    }

    const hourlyCost = readNonNegativeCost(row?.hourlyCost);
    if (row?.hourlyCost != null && hourlyCost == null) {
      throw new Error(`Hourly cost must be zero or greater for: ${work}`);
    }

    result.push({
      work,
      unit,
      laborNormHoursPerUnit: norm,
      hourlyCost,
      costCalculationMode: readCostCalculationMode(row?.costCalculationMode),
    });
  }

  return result;
}
