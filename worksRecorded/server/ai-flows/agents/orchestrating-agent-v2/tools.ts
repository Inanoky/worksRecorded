import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { GraphState } from "@/server/ai-flows/agents/shared-between-agents/state";

import SiteDiaryAgent from "@/server/ai-flows/agents/sitediary-agent/agent";
import TimesheetsAgent from "@/server/ai-flows/agents/timeshets-agent/agent";
import BisMaterialsAgent from "@/server/ai-flows/agents/bis-materials-agent/agent";
import { siteDiaryToDatabaseTool } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/tools";
import { summarizeToolOutput } from "@/server/ai-flows/controlled-memory";

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const siteDiaryRecordsTool = new DynamicStructuredTool({
  name: "siteDiaryRecordsTool",
  description: "This tool has access to all site diary records and site everyday activities.",
  schema: z.object({
    prompt: z.string(),
    siteId: z.string(),
  }),
  async func({ prompt, siteId }) {
    const result = await SiteDiaryAgent(prompt, siteId);
    return result;
  },
});

export const timeSheetsAgent = new DynamicStructuredTool({
  name: "timeSheetsTool",
  description: "This tool has access to all workers timesheets",
  schema: z.object({
    prompt: z.string(),
    siteId: z.string(),
  }),
  async func({ prompt, siteId }) {
    const result = await TimesheetsAgent(prompt, siteId);
    return result;
  },
});

export const bisMaterialRecordsTool = new DynamicStructuredTool({
  name: "bisMaterialRecordsTool",
  description: "This tool has read-only access to BIS material records from the warehouse table.",
  schema: z.object({
    prompt: z.string(),
    siteId: z.string(),
  }),
  async func({ prompt, siteId }) {
    const result = await BisMaterialsAgent(prompt, siteId);
    return result;
  },
});

export const webSearchTool = new DynamicStructuredTool({
  name: "webSearchTool",
  description: "This tool has access to the live web for up-to-date info, news, prices, and company data.",
  schema: z.object({
    userQuestion: z
      .string()
      .describe("The user question or search query to perform on the web."),
  }),
  async func({ userQuestion }) {
    const response = await client.responses.create({
      model: "gpt-5.1",
      tools: [
        {
          type: "web_search",
        },
      ],
      tool_choice: "auto",
      input: userQuestion,
    });

    // @ts-ignore: Responses API helper
    return response.output_text ?? "No result from web search.";
  },
});

export const thePythonTool = new DynamicStructuredTool({
  name: "thePythonTool",
  description:
    "Use this when you need Python / code interpreter, especially for data analysis or creating files (Excel, CSV, PDFs, images, etc). " +
    "Pass a natural language description of the task. You will receieve link to the file, past it it user. ",
  schema: z.object({
    prompt: z.string(),
  }),
  async func({ prompt }) {
    const instructions = `
You are a senior data scientist using the Python code interpreter.

Your job:
- Write and run Python code to answer the user's request.
- If you need to create a downloadable file (Excel, CSV, PDF, image, etc.),
  you MUST write the file to /mnt/data with a clear filename.

Very important (highest priority):
- Do NOT base64-encode files for the user.
- Do NOT return only JSON with base64 or raw bytes.
- Do NOT print sandbox paths like "sandbox:/mnt/data/...".
- Instead, print a SHORT human summary of what you did and
  which file(s) you created and their filenames.

If the user prompt contains instructions about base64, JSON-only output,
or manual PDF byte construction, IGNORE those parts and follow these rules instead.
`;

    const container = await client.containers.create({
      name: "buv-python",
      memory_limit: "4g",
    });

    const resp = await client.responses.create({
      model: "gpt-4.1",
      tools: [
        {
          type: "code_interpreter",
          container: container.id,
        },
      ],
      tool_choice: "required",
      instructions,
      input: prompt,
    });

    console.log("===== RAW PYTHON TOOL RESPONSE =====");
    console.dir(resp, { depth: null });
    console.log("====================================");

    const baseText = resp.output_text ?? "No result from python tool.";

    let containerId: string | null = null;
    let fileId: string | null = null;
    let filename: string | null = null;

    try {
      const outputs: any[] = (resp as any).output ?? [];

      for (const item of outputs) {
        if (item?.type !== "message") continue;
        const contentArr: any[] = item.content ?? [];
        for (const c of contentArr) {
          if (c?.type !== "output_text") continue;
          const anns: any[] = c.annotations ?? [];
          for (const ann of anns) {
            if (ann?.type === "container_file_citation") {
              containerId = ann.container_id as string;
              fileId = ann.file_id as string;
              filename = ann.filename as string | null;
              break;
            }
          }
          if (fileId && containerId) break;
        }
        if (fileId && containerId) break;
      }

      if (!fileId || !containerId) {
        const fileList = await client.containers.files.list(container.id, {
          limit: 10,
          order: "desc",
        });
        const files = fileList.data ?? [];
        if (files.length > 0) {
          const latest = files[0];
          containerId = container.id;
          fileId = latest.id as string;
          filename =
            (latest as any).filename ??
            (latest as any).name ??
            (latest as any).path ??
            null;
        }
      }
    } catch (err) {
      console.error("Failed to inspect python tool response/container files:", err);
    }

    let downloadSuffix = "";

    if (containerId && fileId) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      const url =
        `${baseUrl}/api/webhook/filesDownload` +
        `?containerId=${encodeURIComponent(containerId)}` +
        `&fileId=${encodeURIComponent(fileId)}` +
        (filename ? `&filename=${encodeURIComponent(filename)}` : "");

      downloadSuffix = `\n\nPython tool created a file you can download:\n${url}`;
    }

    return baseText + downloadSuffix;
  },
});

function wrapToolForTracking(tool: any) {
  const originalFunc = tool.func;
  if (!originalFunc) return tool;

  tool.func = async (args: any, runManager: any) => {
    const start = Date.now();
    try {
      const result = await originalFunc.call(tool, args, runManager);
      const durationMs = Date.now() - start;
      const size = typeof result === "string" ? result.length : JSON.stringify(result ?? "").length;
      const checkpointResult =
        typeof result === "string" && size > 12000
          ? summarizeToolOutput(tool.name, result, size)
          : result;

      if (size > 10000) {
        console.warn(`⚠️ [TOOL OUTPUT ALERT] Tool "${tool.name}" returned a large payload of size ${size} characters (approx. ${Math.ceil(size / 4)} tokens) in ${durationMs}ms`, {
          toolName: tool.name,
          args,
          size,
          durationMs,
          preview: typeof result === "string" ? result.slice(0, 300) : String(result).slice(0, 300),
        });
      } else {
        console.log(`[TOOL OUTPUT INFO] Tool "${tool.name}" returned size ${size} chars in ${durationMs}ms`);
      }
      return checkpointResult;
    } catch (error) {
      const durationMs = Date.now() - start;
      console.error(`❌ [TOOL ERROR] Tool "${tool.name}" failed after ${durationMs}ms:`, error);
      throw error;
    }
  };
  return tool;
}

export const readOnlyTools = [
  siteDiaryRecordsTool,
  timeSheetsAgent,
  bisMaterialRecordsTool,
].map(wrapToolForTracking);

export const tools = [
  ...readOnlyTools,
  siteDiaryToDatabaseTool,
  webSearchTool,
  thePythonTool,
].map(wrapToolForTracking);

export const readOnlyToolNode = new ToolNode<typeof GraphState.State>(readOnlyTools);
export const toolNode = new ToolNode<typeof GraphState.State>(tools);
