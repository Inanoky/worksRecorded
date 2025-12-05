import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import {retriever} from "@/server/ai-flows/agents/shared-between-agents/retrievers";
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {GraphState} from "@/server/ai-flows/agents/shared-between-agents/state";
import InvoiceAgent from "@/server/ai-flows/agents/invoices-agent/agent";
import SiteDiaryAgent from "@/server/ai-flows/agents/sitediary-agent/agent";
import TimesheetsAgent from "@/server/ai-flows/agents/timeshets-agent/agent";
import { siteDiaryToDatabaseTool } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/tools";
import { ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";


// ⬅️ new helper
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});



export const constructionDocumentationTool = new DynamicStructuredTool({
  name: "constructionDocumentationTool",
  description: "This tool has access to all project legal and technical documentation",
  schema: z.object({
    prompt: z.string(),
    siteId: z.string(),
  }),
  async func({ prompt, siteId }) {
    return await retriever(prompt, siteId);
  },
});

export const invoiceAgentTool = new DynamicStructuredTool({
  name: "invoiceAgentTool",
  description: "This tool has acess to all invoices in the project",
  schema: z.object({
    prompt: z.string(),
    siteId: z.string(),
  }),
  async func({ prompt, siteId }) {

      const result = await InvoiceAgent(prompt, siteId);
    // console.log("[general_sql_agent] Tool returned:", result);
    return result;

  },
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
    // console.log("[general_sql_agent] Tool returned:", result);
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
    // console.log("[general_sql_agent] Tool returned:", result);
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
      model: "gpt-4.1", // or "o4-mini", "gpt-4.1", etc.
      tools: [
        {
          type: "web_search",
          // Optional:
          // filters: { allowed_domains: ["ec.europa.eu", "likumi.lv"] },
          // user_location: {
          //   type: "approximate",
          //   country: "LV",
          //   city: "Riga",
          //   region: "Riga",
          // },
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

      // 1) Prefer container_file_citation annotations
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

      // 2) Fallback – list container files if no citation found
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


export const tools = [
  constructionDocumentationTool,
  invoiceAgentTool,
  siteDiaryRecordsTool,
  timeSheetsAgent,
   siteDiaryToDatabaseTool,
   webSearchTool,
   thePythonTool
  ]

export const toolNode = new ToolNode<typeof GraphState.State>(tools)


