export type OrganizationMaterialConfigurationTemplate = {
  id: string;
  materialKind: string;
  materialType: string;
  manufacturer: string;
  measurement: string;
  measurementUnit: string | null;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeMaterialConfigurationTemplates(value: unknown): OrganizationMaterialConfigurationTemplate[] {
  const parsedValue = typeof value === "string" ? safeJsonParse(value) : value;

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  const seenIds = new Set<string>();

  return parsedValue
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const materialKind = readString(record.materialKind ?? record.material_kind);
      const materialType = readString(record.materialType ?? record.material_type);
      const manufacturer = readString(record.manufacturer);
      const measurement = readString(record.measurement);
      const measurementUnit = readString(record.measurementUnit ?? record.measurement_unit) || null;
      const fallbackId = [materialKind, materialType, manufacturer, measurement]
        .join("-")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const id = readString(record.id) || fallbackId;

      if (!id || !materialKind || !materialType || !manufacturer || !measurement) {
        return null;
      }

      const template: OrganizationMaterialConfigurationTemplate = {
        id,
        materialKind,
        materialType,
        manufacturer,
        measurement,
        measurementUnit,
      };

      return template;
    })
    .filter((item): item is OrganizationMaterialConfigurationTemplate => Boolean(item))
    .filter((item) => {
      if (seenIds.has(item.id)) {
        return false;
      }

      seenIds.add(item.id);
      return true;
    })
    .sort((a, b) => a.materialKind.localeCompare(b.materialKind));
}

export function serializeMaterialConfigurationTemplates(
  templates: OrganizationMaterialConfigurationTemplate[],
) {
  return normalizeMaterialConfigurationTemplates(templates).map((template) => ({
    id: template.id,
    materialKind: template.materialKind,
    materialType: template.materialType,
    manufacturer: template.manufacturer,
    measurement: template.measurement,
    measurementUnit: template.measurementUnit,
  }));
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
