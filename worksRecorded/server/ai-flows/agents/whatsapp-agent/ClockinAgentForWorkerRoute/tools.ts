import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { clockInWorker, clockOutWorker } from "@/server/actions/timesheets-actions";
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {GraphState} from "@/server/ai-flows/agents/shared-between-agents/state";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { saveSiteDiaryRecord } from "@/server/actions/site-diary-actions";
import defaultConfig from "@/components/sitediary/defaultConfig.json"
import { getConfig } from "@/server/actions/site-diary-actions";
import { buildZodSchemaFromConfig, mapToDbFields } from "../SiteManagerAgentForSiteManagerRoute/AIschemas"

const systemPromptSaveToDatabase = ` Save users's message. Your output MUST be a JSON array that strictly adheres to the provided Zod schema.  Date must be in ISO format.`;
// === HELPER FUNCTIONS (re-copied from SiteManager's tools.ts for context) ===





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
    originalUserComment: z.string().describe("The worker's original message saved without modification."),
  }),
  async func({ question, workerId, siteId, date, originalUserComment }: { question: string; workerId: string, siteId: string, date: string, originalUserComment: string }) {

    // Extracting schema from site settings
   

    

     const map = await getConfig(siteId);
    const mapToUse = map ? map : defaultConfig;



     const { schema: SiteDiaryRecordSchema, fieldMap } =
          buildZodSchemaFromConfig(mapToUse);


       const SiteDiaryRecordsSchema = z.object({
      records: z.array(SiteDiaryRecordSchema),
    });

    const llm = new ChatOpenAI({
      temperature: 0.1,
      model: "gpt-5.1", // Using a capable model for structured output
    });


    // Setup Structured LLM
      const structuredLlm = llm.withStructuredOutput(
      SiteDiaryRecordsSchema


    );
    const response = await structuredLlm.invoke([
      new HumanMessage(`${question}`),
      new SystemMessage(`${systemPromptSaveToDatabase} \n today is : ${date} \n ${siteId} `)



    ]);

// 5️⃣ Map to DB rows
    const rows = response.records.map((r, i) => {
      const mapped = mapToDbFields(r, fieldMap);

      console.log(`🧩 Mapped row ${i + 1}:`, mapped);

      return mapped;
    });


     const result = await saveSiteDiaryRecord({
          rows,
          workerId,
          siteId,
          originalUserComment,
        });




    // UPDATE: saveSiteDiaryRecord must be updated to accept workerId
    // Assuming saveSiteDiaryRecord is updated to check for workerId/userId:

   if (result.ok) { // <-- Change to check for 'ok'
  return `Site diary entry saved successfully.`;
} else {
  // Change to use 'message' and provide a fallback
  return `Failed to save site diary entry: ${result.message ?? 'Unknown error.'}`; 
}
  }
});

export const tools = [clockInWorkerTool, clockOutWorkerTool, workerDiaryToDatabaseTool];
export const toolNode = new ToolNode<typeof GraphState.State>(tools);