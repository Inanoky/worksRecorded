import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {GraphState} from "@/server/ai-flows/agents/shared-between-agents/state";
import {ChatOpenAI} from "@langchain/openai";

import {getSiteDiarySchema} from "@/server/actions/site-diary-actions";
import { saveSiteDiaryRecord } from "@/server/actions/site-diary-actions";
import {HumanMessage, SystemMessage, ToolMessage} from "@langchain/core/messages"; // Adjust if needed
import { systemPromptSaveToDatabaseFunction } from "./prompts";
import defaultConfig from "@/components/sitediary/defaultConfig.json"
import { getConfig } from "@/server/actions/site-diary-actions";
import { buildZodSchemaFromConfig, mapToDbFields } from "./AIschemas";





export const allowedUnits = [
  "m", "m2", "m3", "tn", "kg",
  "pcs", "package", "project",
  "hour", "set", "minute", "lifts",
] as const;


export const siteDiaryToDatabaseTool = new DynamicStructuredTool({
  name: "save_to_database",
  description: "Save construction site log to the database",
  schema: z.object({
    question: z.string().describe("Original user's question in original language"),
    siteId: z.string(),
    userId: z.string(),
    date: z.string(),
  }),
  async func({ question, userId, siteId , date }: {question: string; userId: string, siteId:string, date: DateTime }) {


                 

                const map = await getConfig(siteId)
              
                const mapToUse = map ? map : defaultConfig

                   const { schema: SiteDiaryRecordSchema, fieldMap } = buildZodSchemaFromConfig(mapToUse);

                  const SiteDiaryRecordsSchema = z.object({
                    records: z.array(SiteDiaryRecordSchema),
                  });

                   const client =  map?.AIpromptToUse?.Client;




                
                   
                const llm = new ChatOpenAI({
                 
                  model: "gpt-5.2",
                  reasoning: {effort: "high"}
                });

                // Setup Structured LLM
                const structuredLlm = llm.withStructuredOutput(
               
                  SiteDiaryRecordsSchema 
               
                );
         

                const response = await structuredLlm.invoke([
                  new HumanMessage(`${question} Date is : ${date}`),
                  new SystemMessage(`${await systemPromptSaveToDatabaseFunction(userId,client)} \n today is : ${date} \n ${siteId} `)
                ]);

         
              


                const row = mapToDbFields(response as Record<string, any>, fieldMap);


                 await saveSiteDiaryRecord({
                        rows: [row],
                        userId,
                        siteId,
                      });


                return `Saved succesfully `



  },
});

export const tools = [siteDiaryToDatabaseTool]

export const toolNode = new ToolNode<typeof GraphState.State>(tools)


