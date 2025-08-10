import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import {retriever} from "@/components/AI/RAG/LanggraphAgentVersion/retrievers";
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {GraphState} from "@/components/AI/RAG/LanggraphAgentVersion/state";
import aiGeneral from "@/components/AI/SQL/aiGeneral";
import {ChatOpenAI} from "@langchain/openai";
import {systemPrompt, systemPromptSaveToDatabase} from "@/components/AI/Whatsapp/prompts";
import {getSiteDiarySchema} from "@/app/siteDiaryActions";
import { saveSiteDiaryRecords } from "@/app/siteDiaryActions";
import {AIMessage, HumanMessage, SystemMessage, ToolMessage} from "@langchain/core/messages"; // Adjust if needed


export const siteDiaryToDatabaseTool = new DynamicStructuredTool({
  name: "Save_to_database",
  description: "Save construction site log to the database",
  schema: z.object({
    question: z.string(),
    siteId: z.string(),
    userId: z.string()
  }),
  async func({ question, userId, siteId }: {question: string; userId: string, siteId:string }) {


                    // Extracting schema

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
                const WorksEnum = z.union([
                    z.enum(workNames as [string, ...string[]]),
                    z.literal("Additional works"),
                  ]);


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
                  new HumanMessage(`${question}`),
                  new SystemMessage(systemPromptSaveToDatabase)
                ]);


                console.log("====== Structured LLM Response ======");
                console.log(JSON.stringify(response, null, 2));
                console.log("=====================================");

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


                const result = await saveSiteDiaryRecords({
                          rows,
                          userId,
                          siteId,

                        });

                return {messages: [new ToolMessage({ content : "Saved succesfully"})]}



  },
});

export const tools = [siteDiaryToDatabaseTool]

export const toolNode = new ToolNode<typeof GraphState.State>(tools)


