
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { saveProjectDiaryRecord } from "@/app/ProjectDiaryActions";

export const siteDiaryToDatabaseTool = new DynamicStructuredTool({
  name: "Save_to_database",
  description: "Save a single site diary record to the database.",
  schema: z.object({
    record: z.string().describe("The diary entry text to save in the `Record` field."),
    siteId: z.string(),
    userId: z.string(),
    date: z.coerce.date().describe("JavaScript Date object or ISO date string."),
  }),
  async func({
    record,
    userId,
    siteId,
    date,
  }: {
    record: string;
    userId: string;
    siteId: string;
    date: Date;
  }) {
    const result = await saveProjectDiaryRecord({
      userId,
      siteId,
      date,
      record,
    });

    return result; // "successfully saved to database" or "something went wrong"
  },
});

export const tools = [siteDiaryToDatabaseTool];
export const toolNode = new ToolNode(tools);
