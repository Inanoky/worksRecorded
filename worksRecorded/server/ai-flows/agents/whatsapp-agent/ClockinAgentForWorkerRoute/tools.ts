import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { clockOutWorker } from "@/server/actions/timesheets-actions";
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {GraphState} from "@/server/ai-flows/agents/shared-between-agents/state";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { saveSiteDiaryRecord } from "@/server/actions/site-diary-actions";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json"

import { getConfig } from "@/server/actions/site-diary-actions";
import { buildZodSchemaFromConfig, mapToDbFields } from "../SiteManagerAgentForSiteManagerRoute/AIschemas"
import { getOrganizationLanguageByWorkerId } from "@/server/actions/shared-actions";
import { prisma } from "@/lib/utils/db";
import { getMetaReplyContext, sendClockInCard } from "@/lib/utils/whatsapp-helpers/shared/sender";
import { createClockInToken } from "@/lib/utils/clock-in-link";
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";

async function buildSystemPromptSaveToDatabase(workerId: string) {
  const organizationLanguage = await getOrganizationLanguageByWorkerId(workerId);

  return `Save the worker's message. Your output MUST strictly adhere to the provided Zod schema. Date must be in ISO format. Write all generated comments and summaries in ${organizationLanguage}, which is the organization language for this worker. Keep the worker's original language only in originalUserComment and do not copy it into Comments fields unless the organization language is the same.`;
}
// === HELPER FUNCTIONS (re-copied from SiteManager's tools.ts for context) ===





export const CLOCK_IN_CARD_SENT_TOKEN = "__CLOCK_IN_CARD_SENT__";

export async function startClockInFlow(args: { workerId: string; siteId: string }) {
  const { workerId, siteId } = args;
  const worker = await prisma.workers.findUnique({
    where: { id: workerId },
    select: {
      id: true,
      phone: true,
      isClockedIn: true,
      siteId: true,
    },
  });

  if (!worker) {
    return { messages: ["Failed to clock in: worker not found."] };
  }

  if (worker.isClockedIn) {
    return { messages: ["You are already clocked in."] };
  }

  if (!worker.siteId || worker.siteId !== siteId) {
    return { messages: ["Failed to clock in: worker is not assigned to this site."] };
  }

  if (!worker.phone) {
    return { messages: ["Failed to clock in: worker phone is missing."] };
  }

  const normalizedRecipient = worker.phone.startsWith("whatsapp:")
    ? worker.phone
    : `whatsapp:${worker.phone}`;

  const token = createClockInToken({
    workerId,
    siteId,
    ttlSeconds: 15 * 60,
    businessPhoneNumberId: getMetaReplyContext()?.businessPhoneNumberId,
  });
  const baseUrl =
    process.env.CLOCKIN_BROWSER_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://unimperiously-unbilleted-soo.ngrok-free.dev";
  const clockInLink = `${baseUrl.replace(/\/$/, "")}/clock-in?token=${encodeURIComponent(token)}`;

  await sendClockInCard(normalizedRecipient, {
    title: "Clock in",
    body: "Tap the button to open GPS authorization and complete clock in.",
    buttonText: "Clock in",
    url: clockInLink,
  });

  return { messages: [CLOCK_IN_CARD_SENT_TOKEN] };
}

export const clockInWorkerTool = new DynamicStructuredTool({
  name: "ClockInWorker",
  description: "Start worker clock-in flow by sending a secure clock-in link that collects phone GPS in browser",
  schema: z.object({
    workerId: z.string().describe("The unique worker ID"),
     siteId: z.string().describe("Site Id "),
    
  }),
  async func({ workerId, siteId}) {
    return startClockInFlow({ workerId, siteId });
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
    const { originalAudioUrl } = getWhatsappSourceContext();

    console.log("[originalAudioUrl][workerTool] received app context", {
      hasOriginalAudioUrl: Boolean(originalAudioUrl),
      originalAudioUrlLength: originalAudioUrl?.length ?? 0,
      workerId,
      siteId,
    });

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
      new SystemMessage(`${await buildSystemPromptSaveToDatabase(workerId)} \n today is : ${date} \n ${siteId} `)



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
          originalAudioUrl,
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
