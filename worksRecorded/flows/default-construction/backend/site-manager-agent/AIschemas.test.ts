import {
  buildZodSchemaFromConfig,
  mapToDbFields,
} from "@/flows/default-construction/backend/site-manager-agent/AIschemas";

describe("buildZodSchemaFromConfig", () => {
  it("keeps safe dropdown values as a strict enum", () => {
    const { schema } = buildZodSchemaFromConfig({
      Works: {
        Type: "dropdown",
        DisplayName: "Darbi",
        DropDownOptions: {
          walls: "Sienu izbūve",
          curbs: "Ceļa apmales",
        },
      },
    });

    expect(schema.safeParse({ Darbi: "Ceļa apmales" }).success).toBe(true);
    expect(schema.safeParse({ Darbi: "Nezināms darbs" }).success).toBe(false);
  });

  it("uses a safe enum alias and maps it back when an option contains a quote", () => {
    const { schema, fieldMap, dropdownValueMaps } = buildZodSchemaFromConfig({
      Works: {
        Type: "dropdown",
        DisplayName: "Darbi",
        DropDownOptions: {
          pipe: 'Caurule 2"',
          curbs: "Ceļa apmales",
        },
      },
    });

    const parsed = schema.safeParse({ Darbi: "Caurule 2 inch" });
    expect(parsed.success).toBe(true);
    expect(schema.safeParse({ Darbi: "Ceļa apmales" }).success).toBe(true);
    expect(schema.safeParse({ Darbi: "Izdomāts darbs" }).success).toBe(false);

    if (!parsed.success) throw new Error("Expected safe alias to parse");
    expect(
      mapToDbFields(parsed.data, fieldMap, dropdownValueMaps),
    ).toEqual({ Works: 'Caurule 2"' });
  });

  it("adds default AI descriptions for worker, hour, and amount fields", () => {
    const { schema } = buildZodSchemaFromConfig({
      WorkersInvolved: {
        Type: "float",
        DisplayName: "Workers",
        customSettings: { integer: true },
      },
      TimeInvolved: {
        Type: "float",
        DisplayName: "Hours",
        customSettings: { integer: true },
      },
      Amounts: {
        Type: "float",
        DisplayName: "Amounts",
      },
    });

    const shape = (schema as any).shape;
    expect(shape.Workers.description).toContain("Leave null if the worker count is unknown");
    expect(shape.Workers.description).not.toContain("default to 1 worker");
    expect(shape.Workers.description).not.toContain("Every completed work row");
    expect(shape.Workers.description).toContain("2 cilvēki");
    expect(shape.Workers.description).toContain("2 strādnieki");
    expect(shape.Workers.description).toContain("trīs strādnieki");
    expect(shape.Workers.description).toContain("darbinieki: 2");
    expect(shape.Hours.description).toContain("3h");
    expect(shape.Amounts.description).toContain("not worker count");
  });

  it("keeps explicit AI descriptions over defaults", () => {
    const { schema } = buildZodSchemaFromConfig({
      WorkersInvolved: {
        Type: "float",
        DisplayName: "Workers",
        customSettings: {
          integer: true,
          aiDescription: "Custom workers guidance",
        },
      },
    });

    const shape = (schema as any).shape;
    expect(shape.Workers.description).toBe("Custom workers guidance");
  });
});
