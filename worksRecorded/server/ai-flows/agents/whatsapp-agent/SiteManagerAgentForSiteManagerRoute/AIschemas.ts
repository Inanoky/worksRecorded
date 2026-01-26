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
  DropDownOptions?: Record<string, string>;
  customSettings?: {
    integer?: boolean;
    aiDescription?: string;
  };
};

type ConfigMap = Record<string, MapField>;

function enumFromDropdown(field: MapField) {
  const values = Object.values(field.DropDownOptions ?? {});
  if (!values.length) return z.string();
  return z.enum(values as [string, ...string[]]);
}

function withAiDescription(schema: z.ZodTypeAny, field: MapField) {
  const d = field.customSettings?.aiDescription?.trim();
  return d ? schema.describe(d) : schema;
}

function buildFieldSchema(field: MapField): z.ZodTypeAny | null {
  switch (field.Type) {
    case "noRender":
      return null; // ✅ ignore

    case "fixed":
      return z.union([z.coerce.date(), z.string()]).nullable().optional();

    case "datePicker":
    case "timePicker":
      return z.coerce.date().nullable().optional();

    case "dropdown":
      return enumFromDropdown(field).nullable().optional();

    case "textInput":
      return z.string().max(2000).nullable().optional();

    case "float": {
      const base = z.coerce.number();
      const num = field.customSettings?.integer ? base.int() : base;
      return num.nullable().optional();
    }

    default:
      return z.any().nullable().optional();
  }
}

export function buildZodSchemaFromConfig(config: ConfigMap) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, field] of Object.entries(config)) {
    const schema = buildFieldSchema(field);
    if (!schema) continue; // ✅ skip noRender

    shape[key] = withAiDescription(schema, field);
  }

  return z.object(shape);
}
