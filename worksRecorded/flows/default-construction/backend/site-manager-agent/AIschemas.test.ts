import { spawnSync } from "node:child_process";
import {
	buildZodSchemaFromConfig,
	mapToDbFields,
} from "@/flows/default-construction/backend/site-manager-agent/AIschemas";

describe("buildZodSchemaFromConfig", () => {
	it("preserves null numeric values without coercing null to zero", () => {
		const { schema } = buildZodSchemaFromConfig({
			Amounts: { Type: "float", DisplayName: "Quantity" },
			TimeInvolved: { Type: "float", DisplayName: "Hours" },
			WorkersInvolved: {
				Type: "float",
				DisplayName: "Workers",
				customSettings: { integer: true },
			},
		});
		expect(
			schema.parse({ Quantity: null, Hours: null, Workers: null }),
		).toEqual({ Quantity: null, Hours: null, Workers: null });
		expect(
			schema.parse({ Quantity: "12.5", Hours: "9.5", Workers: "2" }),
		).toEqual({ Quantity: 12.5, Hours: 9.5, Workers: 2 });
		expect(schema.safeParse({ Workers: 2.5 }).success).toBe(false);
		expect(schema.safeParse({ Hours: -1 }).success).toBe(false);
	});

	it("sends real nullable numeric types to OpenAI instead of the unsupported nullable keyword", () => {
		const script = `
const assert = require("node:assert/strict");
const { z } = require("zod");
const { ChatOpenAI } = require("@langchain/openai");
const { buildZodSchemaFromConfig } = require("./flows/default-construction/backend/site-manager-agent/AIschemas.ts");
const config = { Amounts: { Type: "float", DisplayName: "Amounts" }, TimeInvolved: { Type: "float", DisplayName: "Hours" }, WorkersInvolved: { Type: "float", DisplayName: "Workers", customSettings: { integer: true } } };
const { schema } = buildZodSchemaFromConfig(config);
let requests = 0;
const llm = new ChatOpenAI({ apiKey: "local-schema-check", model: "gpt-6.1-sol", useResponsesApi: true, maxRetries: 0, configuration: { fetch: async (_url, init) => {
  requests++;
  const payload = JSON.parse(init.body);
  const root = payload.text.format.schema;
  const properties = root.properties.records.items.properties;
  function allowsNull(node) { return node.type === "null" || Array.isArray(node.type) && node.type.includes("null") || (node.anyOf ?? []).some(allowsNull); }
  for (const key of ["Amounts", "Hours", "Workers"]) assert.equal(allowsNull(properties[key]), true, key);
  assert.equal(JSON.stringify(root).includes('"nullable"'), false);
  return new Response(JSON.stringify({ id: "resp_nullable", object: "response", created_at: 1, model: "gpt-6.1-sol", status: "completed", text: { format: { type: "json_schema" } }, output: [{ id: "msg_nullable", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify({ records: [{ Amounts: null, Hours: null, Workers: null }] }), annotations: [] }] }] }), { headers: { "Content-Type": "application/json" } });
} } });
llm.withStructuredOutput(z.object({ records: z.array(schema) }), { includeRaw: true }).invoke("Quantity is unknown").then((result) => { assert.deepEqual(result.parsed.records[0], { Amounts: null, Hours: null, Workers: null }); assert.equal(requests, 1); }).catch((error) => { console.error(error); process.exitCode = 1; });
`;
		const result = spawnSync(
			process.execPath,
			["--import", "tsx", "-e", script],
			{ cwd: process.cwd(), encoding: "utf8", timeout: 15_000 },
		);
		expect(result.error).toBeUndefined();
		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
	});
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
		expect(mapToDbFields(parsed.data, fieldMap, dropdownValueMaps)).toEqual({
			Works: 'Caurule 2"',
		});
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
		expect(shape.Workers.description).toContain(
			"Leave null if the worker count is unknown",
		);
		expect(shape.Workers.description).not.toContain("default to 1 worker");
		expect(shape.Workers.description).not.toContain("Every completed work row");
		expect(shape.Workers.description).toContain("2 cilvēki");
		expect(shape.Workers.description).toContain("2 strādnieki");
		expect(shape.Workers.description).toContain("trīs strādnieki");
		expect(shape.Workers.description).toContain("darbinieki: 2");
		expect(shape.Workers.description).toContain(
			"ekskavatora operators un palīgstrādnieks",
		);
		expect(shape.Workers.description).toContain("Do not infer Workers: 1");
		expect(shape.Hours.description).toContain("3h");
		expect(shape.Amounts.description).toContain("not worker count");
		expect(
			schema.safeParse({ Workers: 2, Hours: 9.5, Amounts: null }).success,
		).toBe(true);
		expect(
			schema.safeParse({ Workers: 2, Hours: -1, Amounts: null }).success,
		).toBe(false);
		expect(
			schema.safeParse({ Workers: 2.5, Hours: 9.5, Amounts: null }).success,
		).toBe(false);
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
