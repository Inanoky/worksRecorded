import { compareSiteDiaryWorks } from "./site-diary-work-order";

export const DEFAULT_CONSTRUCTION_PRODUCTIVITY_SETTINGS_KEY =
  "defaultConstructionProductivity";

export type DefaultConstructionWorkProductivitySetting = {
  work: string;
  unit: string;
  laborNormHoursPerUnit: number | null;
  hourlyCost?: number | null;
};

export type DefaultConstructionProductivitySettings = {
  version: 2;
  works: DefaultConstructionWorkProductivitySetting[];
};

const normalizedKey = (value: unknown) =>
  String(value ?? "").trim().toLocaleLowerCase("lv");

function readDropdownOptions(config: Record<string, any>, field: string): string[] {
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

export function getDefaultConstructionProductivitySettings(
  config: Record<string, any>,
): DefaultConstructionProductivitySettings {
  const rawSettings = config?.otherSettings?.[
    DEFAULT_CONSTRUCTION_PRODUCTIVITY_SETTINGS_KEY
  ];
  const rawWorks = Array.isArray(rawSettings?.works) ? rawSettings.works : [];
  const savedByWork = new Map<string, DefaultConstructionWorkProductivitySetting>();

  for (const raw of rawWorks) {
    const work = String(raw?.work ?? "").trim();
    if (!work) continue;
    savedByWork.set(normalizedKey(work), {
      work,
      unit: String(raw?.unit ?? "").trim(),
      laborNormHoursPerUnit: readPositiveNorm(raw?.laborNormHoursPerUnit),
      hourlyCost: readPositiveNorm(raw?.hourlyCost),
    });
  }

  const dropdownWorks = readDropdownOptions(config, "Works").sort(compareSiteDiaryWorks);
  const works = dropdownWorks.map((work) => {
    const saved = savedByWork.get(normalizedKey(work));
    return {
      work,
      unit: saved?.unit ?? "",
      laborNormHoursPerUnit: saved?.laborNormHoursPerUnit ?? null,
      hourlyCost: saved?.hourlyCost ?? null,
    };
  });

  return { version: 2, works };
}

export function getDefaultConstructionOptionValues(config: Record<string, any>) {
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
    if (work.length > 200) throw new Error("Work name must be 200 characters or less");

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

    const hourlyCost = readPositiveNorm(row?.hourlyCost);
    if (row?.hourlyCost != null && hourlyCost == null) {
      throw new Error(`Hourly cost must be greater than zero for: ${work}`);
    }

    result.push({ work, unit, laborNormHoursPerUnit: norm, hourlyCost });
  }

  return result;
}
