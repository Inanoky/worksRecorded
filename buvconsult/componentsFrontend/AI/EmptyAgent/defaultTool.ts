import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {GraphState} from "@/componentsFrontend/AI/RAG/LanggraphAgentVersion/state";
import {AIMessage, HumanMessage, SystemMessage, ToolMessage} from "@langchain/core/messages"; // Adjust if needed


export const defaultTool= new DynamicStructuredTool({
  name: "Save_to_database",
  description: "Save construction site log to the database",
  schema: z.object({
    question: z.string(),
    siteId: z.string(),
    userId: z.string(),
    date: z.string(),
  }),
  async func({ question, userId, siteId}: {question: string; userId: string, siteId:string }) {

                  console.log("Tool input:", { question, userId, siteId });


                    // Here we can do some server-side logic, like saving to DB
                  const answer = 'Saved successfully';
              

                return answer


  },
});

export const tools = [defaultTool]

export const toolNode = new ToolNode<typeof GraphState.State>(tools)


