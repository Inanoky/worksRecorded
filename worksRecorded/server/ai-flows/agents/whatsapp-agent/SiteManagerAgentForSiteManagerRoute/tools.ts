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
    question: z.string(),
    siteId: z.string(),
    userId: z.string(),
    date: z.string(),
   originalUserComment: z.string()
  }),

  async func({ question, userId, siteId, date, originalUserComment}) {

    console.log("▶️ TOOL START");
    console.log("Input:", { question, userId, siteId, date });

    // 1️⃣ Load config
    const map = await getConfig(siteId);
    const mapToUse = map ? map : defaultConfig;

    console.log("✅ Config loaded:", map ? "DB config" : "Default config");

    // 2️⃣ Build schemas
    const { schema: SiteDiaryRecordSchema, fieldMap } =
      buildZodSchemaFromConfig(mapToUse);

    const SiteDiaryRecordsSchema = z.object({
      records: z.array(SiteDiaryRecordSchema),
    });

    console.log("✅ Zod schemas built");

    const client = map?.AIpromptToUse?.Client;

    // 3️⃣ Init LLM
    const llm = new ChatOpenAI({
      model: "gpt-5.4",
      reasoning: { effort: "minimal" },
    });

    const structuredLlm = llm.withStructuredOutput(
      SiteDiaryRecordsSchema
    );

    console.log("✅ LLM initialized");

    // 4️⃣ Call LLM
    console.log("🤖 Calling LLM...");

    const response = await structuredLlm.invoke([
      new HumanMessage(`${question} Date is : ${date}`),
      new SystemMessage(
        `${await systemPromptSaveToDatabaseFunction(userId, client)}\n` +
        `today is : ${date}\n` +
        `${siteId}`
      ),
    ]);

    console.log("📥 LLM response:");
    console.log(JSON.stringify(response, null, 2));

    // 5️⃣ Map to DB rows
    const rows = response.records.map((r, i) => {
      const mapped = mapToDbFields(r, fieldMap);

      console.log(`🧩 Mapped row ${i + 1}:`, mapped);

      return mapped;
    });

    console.log(`✅ Total rows prepared: ${rows.length}`);

    // 6️⃣ Save to DB
    console.log("💾 Saving to database...");

    const result = await saveSiteDiaryRecord({
      rows,
      userId,
      siteId,
      originalUserComment
    });

    console.log("✅ Save result:", result);

    console.log("🏁 TOOL END");

    return `Saved successfully`;
  },
});


export const tools = [siteDiaryToDatabaseTool]

export const toolNode = new ToolNode<typeof GraphState.State>(tools)


