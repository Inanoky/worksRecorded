import { z } from "zod";

type FieldType =
  | "fixed"
  | "timePicker"
  | "datePicker"
  | "dropdown"
  | "textInput"
  | "float"
  | "noRender";

type MapField = {
  Type: FieldType;
  DisplayName?: string;
  DropDownOptions?: Record<string, string>;
  customSettings?: {
    integer?: boolean;
    aiDescription?: string;
  };
};

type ConfigMap = Record<string, MapField>;

function isSafeStructuredOutputEnumValue(value: string) {
  return !/["\\\u0000-\u001f]/.test(value);
}

function makeSafeStructuredOutputEnumValue(value: string, index: number) {
  const safeValue = value
    .replace(/"/g, " inch")
    .replace(/\\/g, "/")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return safeValue || `Option ${index + 1}`;
}

function enumFromDropdown(field: MapField) {
  const values = Object.values(field.DropDownOptions ?? {});
  if (!values.length) {
    return {
      schema: z.string(),
      valueMap: {} as Record<string, string>,
    };
  }

  const usedAliases = new Set<string>();
  const valueMap: Record<string, string> = {};
  const aliases = values.map((value, index) => {
    const baseAlias = isSafeStructuredOutputEnumValue(value)
      ? value
      : makeSafeStructuredOutputEnumValue(value, index);
    let alias = baseAlias;
    let suffix = 2;

    while (usedAliases.has(alias.toLowerCase())) {
      alias = `${baseAlias} (${suffix})`;
      suffix += 1;
    }

    usedAliases.add(alias.toLowerCase());
    valueMap[alias] = value;
    return alias;
  });

  return {
    schema: z.enum(aliases as [string, ...string[]]),
    valueMap,
  };
}

function withAiDescription(schema: z.ZodTypeAny, field: MapField) {
  const d = field.customSettings?.aiDescription?.trim();
  return d ? schema.describe(d) : schema;
}

function safeKey(name: string) {
  return name.trim().replace(/\s+/g, "_").replace(/[^\w]/g, "");
}

function buildFieldSchema(field: MapField): {
  schema: z.ZodTypeAny;
  valueMap?: Record<string, string>;
} | null {
  switch (field.Type) {
    case "noRender":
      return null;

    case "fixed":
      return {
        schema: z.union([z.coerce.date(), z.string()]).nullable().optional(),
      };

    case "datePicker":
    case "timePicker":
      return { schema: z.coerce.date().nullable().optional() };

    case "dropdown": {
      const dropdown = enumFromDropdown(field);
      return {
        schema: dropdown.schema.nullable().optional(),
        valueMap: dropdown.valueMap,
      };
    }

    case "textInput":
      return { schema: z.string().max(2000).nullable().optional() };

    case "float": {
      const base = z.coerce.number();
      const num = field.customSettings?.integer ? base.int() : base;
      return { schema: num.nullable().optional() };
    }

    default:
      return { schema: z.any().nullable().optional() };
  }
}

export function buildZodSchemaFromConfig(config: ConfigMap) {
  const shape: Record<string, z.ZodTypeAny> = {};
  const fieldMap: Record<string, string> = {}; // displayKey -> dbKey
  const dropdownValueMaps: Record<string, Record<string, string>> = {};

  for (const [dbKey, field] of Object.entries(config)) {
    const fieldSchema = buildFieldSchema(field);
    if (!fieldSchema) continue;

    const displayRaw = field.DisplayName?.trim() || dbKey;
    const displayKey = safeKey(displayRaw);

    shape[displayKey] = withAiDescription(fieldSchema.schema, field);
    fieldMap[displayKey] = dbKey;
    if (fieldSchema.valueMap && Object.keys(fieldSchema.valueMap).length > 0) {
      dropdownValueMaps[displayKey] = fieldSchema.valueMap;
    }
  }

  return {
    schema: z.object(shape),
    fieldMap,
    dropdownValueMaps,
  };
}

export function mapToDbFields(
  data: Record<string, any>,
  fieldMap: Record<string, string>,
  dropdownValueMaps: Record<string, Record<string, string>> = {},
) {
  const out: Record<string, any> = {};

  for (const [displayKey, value] of Object.entries(data)) {
    const dbKey = fieldMap[displayKey];
    if (!dbKey) continue;
    out[dbKey] =
      typeof value === "string"
        ? dropdownValueMaps[displayKey]?.[value] ?? value
        : value;
  }

  return out;
}
