import { z } from "zod";

export type FieldType =
  | "fixed"
  | "timePicker"
  | "datePicker"
  | "dropdown"
  | "textInput"
  | "float"
  | "noRender";

export type MapField = {
  Type: FieldType | string;
  DisplayName?: string;
  DropDownOptions?: Record<string, string>;
  customSettings?: {
    integer?: boolean;
    aiDescription?: string;
  };
};

export type ConfigMap = Record<string, MapField>;

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

export function defaultAiDescription(dbKey: string, displayKey: string) {
  const normalizedDbKey = dbKey.toLowerCase();
  const normalizedDisplayKey = displayKey.toLowerCase();

  if (normalizedDbKey === "workersinvolved" || normalizedDisplayKey === "workers") {
    return "Number of workers or people involved in this activity, not named worker records. Extract explicit counts from phrases like '2 workers', '2 people', '2 cilvēki', '2 strādnieki', 'trīs strādnieki', or 'darbinieki: 2'. Leave null if the worker count is unknown. Do not use 0 unless the source explicitly says zero workers.";
  }

  if (normalizedDbKey === "timeinvolved" || normalizedDisplayKey === "hours") {
    return "Total work duration in hours for this activity. Extract from phrases like '3h', '3 h', '3 hours', or '7 h'. Leave null if unknown.";
  }

  if (normalizedDbKey === "amounts" || normalizedDisplayKey === "amounts") {
    return "Completed work quantity or amount. This is not worker count and not work duration hours. Leave null if the completed quantity is unknown.";
  }

  return null;
}

export function getAiFieldDescription(
  field: MapField,
  dbKey: string,
  displayKey: string,
) {
  return field.customSettings?.aiDescription?.trim() || defaultAiDescription(dbKey, displayKey);
}

function withFieldDescription(
  schema: z.ZodTypeAny,
  field: MapField,
  dbKey: string,
  displayKey: string,
) {
  const description = getAiFieldDescription(field, dbKey, displayKey);
  return description ? schema.describe(description) : schema;
}

function safeKey(name: string) {
  return name.trim().replace(/\s+/g, "_").replace(/[^\w]/g, "");
}

function buildFieldSchema(field: MapField, dbKey: string): {
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
      const displayKey = field.DisplayName?.trim() || "";
      const isHoursField =
        dbKey.toLowerCase() === "timeinvolved" ||
        displayKey.toLowerCase() === "hours" ||
        displayKey.toLowerCase() === "timeinvolved";
      const num = field.customSettings?.integer && !isHoursField ? base.int() : base;
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
    const fieldSchema = buildFieldSchema(field, dbKey);
    if (!fieldSchema) continue;

    const displayRaw = field.DisplayName?.trim() || dbKey;
    const displayKey = safeKey(displayRaw);

    shape[displayKey] = withFieldDescription(fieldSchema.schema, field, dbKey, displayKey);
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
