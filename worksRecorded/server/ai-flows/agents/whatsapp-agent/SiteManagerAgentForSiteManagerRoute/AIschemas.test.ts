import {
  buildZodSchemaFromConfig,
  mapToDbFields,
} from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/AIschemas";

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
});
