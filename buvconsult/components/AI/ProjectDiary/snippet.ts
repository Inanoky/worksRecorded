import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import {retriever} from "@/components/AI/RAG/LanggraphAgentVersion/retrievers";
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {GraphState} from "@/components/AI/RAG/LanggraphAgentVersion/state";
import aiGeneral from "@/components/AI/SQL/aiGeneral";
import {ChatOpenAI} from "@langchain/openai";
import {systemPromptSaveToDatabase} from "@/components/AI/Whatsapp/prompts";
import {getSiteDiarySchema} from "@/app/siteDiaryActions";

const siteId = '48f39d7c-9d7f-4c6e-bb12-b20a8d7e7315'

const question = `Thank you for the details! Just to confirm, here’s what I have:

- On plan 6, Antonio's side:
  - Assembled 12 columns: 4 workers, 5 hours.
  - Assembled 5 beams: 4 workers, 2 hours.

- On plan 6, Strelnik side:
  - Concreting (15 cubic meters): 6 workers, 3 hours.

Is everything correct, or is there anything else to add? If all is correct, I’ll save this information to the database. Thank you very much for your help!`

console.log("Fetching schema for siteId:", siteId);
const schema = await getSiteDiarySchema({ siteId });
console.log("Schema received:", JSON.stringify(schema, null, 2));

function extractLocationNames(schema) {
  return schema.filter(node => node.type === "Location").map(node => node.name);
}
function extractWorkNames(schema) {
  const worksSet = new Set();
  function walk(node) {
    if (node.type === "Work") worksSet.add(node.name);
    node.children?.forEach(walk);
  }
  schema.forEach(walk);
  return Array.from(worksSet);
}

const locationNames = extractLocationNames(schema);
const workNames = extractWorkNames(schema);



console.log("Location names:", locationNames);
console.log("Work names:", workNames);


const LocationEnum = z.enum(locationNames);
const WorksEnum = z.enum(workNames);


// This schema is for validation of
function makeSiteDiaryRecordSchema({ locationNames, workNames }) {
  return z.object({
    siteId: z.string().nullable().optional(),
    Date: z.coerce.date().nullable().optional(),
    Location: LocationEnum.nullable().optional(),
    Works:  WorksEnum.nullable().optional(),
    Comments: z.string().nullable().optional(),
    Units: z.string().nullable().optional(),
    Amounts: z.number().nullable().optional(),
    WorkersInvolved: z.number().int().nullable().optional(),
    TimeInvolved: z.number().nullable().optional(),
  });
}

const SiteDiaryRecordSchema = z.array(makeSiteDiaryRecordSchema({ locationNames, workNames }));

console.log("Zod SiteDiaryRecordSchema created.");

// Setup LLM
const llm = new ChatOpenAI({
  temperature: 0.1,
  model: "gpt-4.1",
});
console.log("ChatOpenAI instance created.");

// Setup Structured LLM
const structuredLlm = llm.withStructuredOutput(
  z.object({
    answer: SiteDiaryRecordSchema
  })
);
console.log("Structured output schema added to LLM.");

console.log("Prompting LLM...");
const response = await structuredLlm.invoke([
  ["human", `${question}`],
  ["system", systemPromptSaveToDatabase]
]);

console.log("====== Structured LLM Response ======");
console.log(JSON.stringify(response, null, 2));
console.log("=====================================");
