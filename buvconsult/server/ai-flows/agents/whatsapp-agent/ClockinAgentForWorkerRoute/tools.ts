import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { clockInWorker, clockOutWorker } from "@/server/actions/timesheets-actions";
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {GraphState} from "@/server/ai-flows/agents/shared-between-agents/state";
import { getSiteDiarySchema } from "@/server/actions/site-diary-actions";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { saveSiteDiaryRecord } from "@/server/actions/site-diary-actions";


const systemPromptSaveToDatabase = `You are an expert at extracting and structuring construction site log data from a human-readable message. Your output MUST be a JSON array that strictly adheres to the provided Zod schema. Analyze the user's message and fill the fields accurately. Date must be in ISO format. Today's date is for context only.`;
// === HELPER FUNCTIONS (re-copied from SiteManager's tools.ts for context) ===
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
function makeSiteDiaryRecordSchema({ LocationEnum, WorksEnum }) {
  return z.object({
    siteId: z.string().nullable().optional(),
    Date: z.coerce.date().nullable().optional(),
    Location: LocationEnum.nullable().optional(),
    Works: WorksEnum.nullable().optional(),
    Comments: z.string().nullable().optional(),
    Units: z.string().nullable().optional(),
    Amounts: z.number().nullable().optional(),
    WorkersInvolved: z.number().int().nullable().optional(),
    TimeInvolved: z.number().nullable().optional(),
  });
}
// === END OF HELPER FUNCTIONS ===




export const clockInWorkerTool = new DynamicStructuredTool({
  name: "ClockInWorker",
  description: "Clock a worker in (start workday)",
  schema: z.object({
    workerId: z.string().describe("The unique worker ID"),
     siteId: z.string().describe("Site Id "),
    
  }),
  async func({ workerId, siteId}) {

    const now = new Date()

    // Server action expects Date objects, not strings
    const result = await clockInWorker({
      workerId,
      date: now,
      clockIn: now,
      siteId
    });
    if (result.success) {
      return { messages: ["Clocked in successfully"] };
    } else {
      return { messages: [`Failed to clock in: ${result.error}`] };
    }
  }
});

export const clockOutWorkerTool = new DynamicStructuredTool({
  name: "ClockOutWorker",
  description: "Clock a worker out (end workday)",
  schema: z.object({
    workerId: z.string().describe("The unique worker ID"),
    // location: z.string().describe("Work location "),
    // works: z.string().describe("Description of work performed"),
   
  }),
  async func({ workerId}) {

        const now = new Date()
    const result = await clockOutWorker({
      
      workerId,
      clockOut: now,
      location : "",
      works : ""
     

    });
    if (result.success) {
      return { messages: ["Clocked out successfully"] };
    } else {
      return { messages: [`Failed to clock out: ${result.error}`] };
    }
  }
});



// NEW TOOL: workerDiaryToDatabaseTool
export const workerDiaryToDatabaseTool = new DynamicStructuredTool({
  name: "WorkerDiaryToDatabase",
  description: "Save a worker's site diary entry (including notes on works, location, etc.) to the database.",
  schema: z.object({
    question: z.string().describe("The user's original message/question detailing the work performed."),
    workerId: z.string().describe("The unique ID of the worker submitting the entry."),
    siteId: z.string().describe("The Site Id for the diary entry."),
    // NEW: The date needs to be a string to pass it as context to the structured LLM
    date: z.string().describe("The current date and time as a string (including time, e.g., '2025-11-21T17:45:00Z')."), 
  }),
  async func({ question, workerId, siteId, date }: { question: string; workerId: string, siteId: string, date: string }) {

    // Extracting schema from site settings
    const schema = await getSiteDiarySchema({ siteId });

    const locationNames = extractLocationNames(schema);
    const workNames = extractWorkNames(schema);

    const LocationEnum = z.enum(locationNames as [string, ...string[]]);
    const WorksEnum = z.union([
      z.enum(workNames as [string, ...string[]]),
      z.literal("Additional works"),
      z.literal("Delay due to the Client"),
      z.literal("Delay due to internal mistakes"),
      z.literal("Notes"),
    ]);

    const SiteDiaryRecordSchema = z.array(makeSiteDiaryRecordSchema({ LocationEnum, WorksEnum }));

    const llm = new ChatOpenAI({
      temperature: 0.1,
      model: "gpt-4.1", // Using a capable model for structured output
    });

    // Setup Structured LLM
    const structuredLlm = llm.withStructuredOutput(
      z.object({
        answer: SiteDiaryRecordSchema
      })
    );

    const response = await structuredLlm.invoke([
      new HumanMessage(`${question}`),
      new SystemMessage(`${systemPromptSaveToDatabase} \n today is : ${date} \n ${siteId} `)
    ]);

    const rows = (response.answer || []).map((r) => ({
      date: r.Date ? new Date(r.Date).toISOString() : null,
      location: r.Location ?? "",
      works: r.Works ?? "",
      comments: r.Comments ?? "",
      units: r.Units ?? "",
      amounts: r.Amounts ?? "",
      workers: r.WorkersInvolved ?? "",
      hours: r.TimeInvolved ?? "",
    }));

    // UPDATE: saveSiteDiaryRecord must be updated to accept workerId
    // Assuming saveSiteDiaryRecord is updated to check for workerId/userId:
    const result = await saveSiteDiaryRecord({
      rows,
      userId: null, // NEW: Set userId to null for worker
      workerId: workerId, // NEW: Pass workerId
      siteId,
    });

    if (result.success) {
      return `Site diary entry saved successfully.`;
    } else {
      return `Failed to save site diary entry: ${result.error}`;
    }
  }
});

export const tools = [clockInWorkerTool, clockOutWorkerTool, workerDiaryToDatabaseTool];
export const toolNode = new ToolNode<typeof GraphState.State>(tools);