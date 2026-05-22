export type MaterialConfigurationTemplateAttachment = {
  name: string;
  mimeType: string;
  base64Data?: string;
  fileUrl?: string;
};

export type OrganizationMaterialConfigurationTemplate = {
  id: string;
  materialKind: string;
  materialType: string;
  manufacturer: string;
  measurement: string;
  measurementUnit: string | null;
  attachments: MaterialConfigurationTemplateAttachment[];
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAttachments(value: unknown): MaterialConfigurationTemplateAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = readString(record.name);
      const mimeType = readString(record.mimeType) || "application/octet-stream";
      const base64Data = readString(record.base64Data);
      const fileUrl = readString(record.fileUrl);

      if (!name || (!base64Data && !fileUrl)) {
        return null;
      }

      return {
        name,
        mimeType,
        ...(base64Data ? { base64Data } : {}),
        ...(fileUrl ? { fileUrl } : {}),
      };
    })
    .filter((item): item is MaterialConfigurationTemplateAttachment => Boolean(item));
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

      return {
        id,
        materialKind,
        materialType,
        manufacturer,
        measurement,
        measurementUnit,
        attachments: normalizeAttachments(record.attachments),
      };
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
    attachments: template.attachments,
  }));
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
