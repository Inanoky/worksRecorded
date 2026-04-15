import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { GraphState } from "@/server/ai-flows/agents/shared-between-agents/state";
import { nukeBackslashes, SQLexecute } from "@/server/ai-flows/agents/sitediary-agent/helpers";

export const postreSQL_bis_material_records_database_query_tool = new DynamicStructuredTool({
  name: "postreSQL_bis_material_records_database_query_tool",
  description: "Queries the PostgreSQL database for BIS material records information",
  schema: z.object({
    postgreSQL_query: z.string(),
  }),
  async func({ postgreSQL_query }: { postgreSQL_query: string }) {
    console.log("Raw Tool input:", postgreSQL_query);

    const clearedSQL_query = nukeBackslashes(postgreSQL_query);

    console.log("Tool input:", clearedSQL_query);

    const { result: rows } = await SQLexecute(clearedSQL_query);
    const safe = JSON.stringify(rows, (_, v) => (typeof v === "bigint" ? v.toString() : v));

    return safe;
  },
});

export const tools = [postreSQL_bis_material_records_database_query_tool];

export const toolNode = new ToolNode<typeof GraphState.State>(tools);
