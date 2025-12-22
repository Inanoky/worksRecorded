import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { retriever } from "@/server/ai-flows/agents/shared-between-agents/retrievers";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { GraphState } from "@/server/ai-flows/agents/shared-between-agents/state";
import InvoiceAgent from "@/server/ai-flows/agents/invoices-agent/agent";
import SiteDiaryAgent from "@/server/ai-flows/agents/sitediary-agent/agent";
import TimesheetsAgent from "@/server/ai-flows/agents/timeshets-agent/agent";
import { siteDiaryToDatabaseTool } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/tools";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// -------------- helper: NEVER throw from tools --------------
function safeTool<TArgs extends Record<string, any>>(
  toolName: string,
  fn: (args: TArgs) => Promise<string>
) {
  return async (args: TArgs) => {
    try {
      const out = await fn(args);
      // Ensure tool returns a string (ToolNode will wrap it into ToolMessage)
      return typeof out === "string" ? out : JSON.stringify(out);
    } catch (e: any) {
      const msg =
        e?.message ??
        (typeof e === "string" ? e : JSON.stringify(e, null, 2));
      // IMPORTANT: return, don't throw
      return `[${toolName}] ERROR: ${msg}`;
    }
  };
}

// ------------------- tools -------------------

export const constructionDocumentationTool = new DynamicStructuredTool({
  name: "constructionDocumentationTool",
  description: "This tool has access to all project legal and technical documentation",
  schema: z.object({
    prompt: z.string(),
    siteId: z.string(),
  }),
  func: safeTool("constructionDocumentationTool", async ({ prompt, siteId }) => {
    const result = await retriever(prompt, siteId);
    return typeof result === "string" ? result : JSON.stringify(result);
  }),
});

export const invoiceAgentTool = new DynamicStructuredTool({
  name: "invoiceAgentTool",
  description: "This tool has acess to all invoices in the project",
  schema: z.object({
    prompt: z.string(),
    siteId: z.string(),
  }),
  func: safeTool("invoiceAgentTool", async ({ prompt, siteId }) => {
    const result = await InvoiceAgent(prompt, siteId);
    return typeof result === "string" ? result : JSON.stringify(result);
  }),
});

export const siteDiaryRecordsTool = new DynamicStructuredTool({
  name: "siteDiaryRecordsTool",
  description: "This tool has access to all site diary records and site everyday activities.",
  schema: z.object({
    prompt: z.string(),
    siteId: z.string(),
  }),
  func: safeTool("siteDiaryRecordsTool", async ({ prompt, siteId }) => {
    const result = await SiteDiaryAgent(prompt, siteId);
    return typeof result === "string" ? result : JSON.stringify(result);
  }),
});

export const timeSheetsAgent = new DynamicStructuredTool({
  name: "timeSheetsTool",
  description: "This tool has access to all workers timesheets",
  schema: z.object({
    prompt: z.string(),
    siteId: z.string(),
  }),
  func: safeTool("timeSheetsTool", async ({ prompt, siteId }) => {
    const result = await TimesheetsAgent(prompt, siteId);
    return typeof result === "string" ? result : JSON.stringify(result);
  }),
});

export const webSearchTool = new DynamicStructuredTool({
  name: "webSearchTool",
  description: "This tool has access to the live web for up-to-date info, news, prices, and company data.",
  schema: z.object({
    userQuestion: z.string().describe("The user question or search query to perform on the web."),
  }),
  func: safeTool("webSearchTool", async ({ userQuestion }) => {
    const response = await client.responses.create({
      model: "gpt-4.1",
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
      input: userQuestion,
    });

    // @ts-ignore
    return response.output_text ?? "No result from web search.";
  }),
});

export const thePythonTool = new DynamicStructuredTool({
  name: "thePythonTool",
  description:
    "Use this when you need Python / code interpreter, especially for data analysis or creating files (Excel, CSV, PDFs, images, etc). " +
    "Pass a natural language description of the task. You will receieve link to the file, past it it user. ",
  schema: z.object({
    prompt: z.string(),
  }),
  func: safeTool("thePythonTool", async ({ prompt }) => {
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
`;

    const container = await client.containers.create({
      name: "buv-python",
      memory_limit: "4g",
    });

    let resp: any;
    try {
      resp = await client.responses.create({
        model: "gpt-4.1",
        tools: [{ type: "code_interpreter", container: container.id }],
        tool_choice: "required",
        instructions,
        input: prompt,
      });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      return `[thePythonTool] ERROR calling Responses API: ${msg}`;
    }

    const baseText = resp?.output_text ?? "No result from python tool.";

    let containerId: string | null = null;
    let fileId: string | null = null;
    let filename: string | null = null;

    try {
      const outputs: any[] = resp?.output ?? [];

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
    } catch (e: any) {
      // Still return text; do not throw
      const msg = e?.message ?? String(e);
      return `${baseText}\n\n[thePythonTool] ERROR inspecting container output: ${msg}`;
    }

    if (containerId && fileId) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const url =
        `${baseUrl}/api/webhook/filesDownload` +
        `?containerId=${encodeURIComponent(containerId)}` +
        `&fileId=${encodeURIComponent(fileId)}` +
        (filename ? `&filename=${encodeURIComponent(filename)}` : "");

      return `${baseText}\n\nPython tool created a file you can download:\n${url}`;
    }

    return baseText;
  }),
});

// IMPORTANT: include ALL tools you want the agent to call
export const tools = [
  constructionDocumentationTool,
  invoiceAgentTool,
  siteDiaryRecordsTool,
  timeSheetsAgent,
  siteDiaryToDatabaseTool,
  webSearchTool,
  thePythonTool,
];

export const toolNode = new ToolNode<typeof GraphState.State>(tools);
