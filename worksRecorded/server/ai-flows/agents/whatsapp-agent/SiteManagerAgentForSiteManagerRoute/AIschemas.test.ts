import { buildZodSchemaFromConfig } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/AIschemas";

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

  it("falls back to a string when a dropdown option contains a quote", () => {
    const { schema } = buildZodSchemaFromConfig({
      Works: {
        Type: "dropdown",
        DisplayName: "Darbi",
        DropDownOptions: {
          pipe: 'Caurule 2"',
          curbs: "Ceļa apmales",
        },
      },
    });

    expect(schema.safeParse({ Darbi: 'Caurule 2"' }).success).toBe(true);
    expect(schema.safeParse({ Darbi: "Ceļa apmales" }).success).toBe(true);
  });
});
