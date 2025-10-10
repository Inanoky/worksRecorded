//C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\componentsFrontend\AI\BuvconsultAgent\InvoicesAgent\Tools.ts
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {GraphState} from "@/server/ai-flows/agents/orchestrating-agent/state";
import { nukeBackslashes, SQLexecute } from "./Functions"






export const timesheets_records_postgreSQL_database_query_tool= new DynamicStructuredTool({
  name: "timesheets_records_postgreSQL_database_query_tool",
  description: "Queries the postgreSQL database for invoice related information",
  schema: z.object({
    postgreSQL_query: z.string(),
   
    
  }),
  async func({ postgreSQL_query }: {postgreSQL_query: string; userId: string, siteId:string }) {

                

                console.log("Raw Tool input:",  postgreSQL_query);

                const clearedSQL_query = nukeBackslashes(postgreSQL_query);
                
                console.log("Tool input:", clearedSQL_query)

                const { result: rows } = await SQLexecute(clearedSQL_query); 
                const safe = JSON.stringify(rows, (_, v) => (typeof v === "bigint" ? v.toString() : v));
           

                return safe



  },
});

export const tools = [timesheets_records_postgreSQL_database_query_tool]

export const toolNode = new ToolNode<typeof GraphState.State>(tools)


