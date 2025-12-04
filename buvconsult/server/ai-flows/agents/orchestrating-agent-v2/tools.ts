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



export const thePythonTool= new DynamicStructuredTool({
  name: "thePythonTool",
  description: "This tool has access Python code interpreter and can create and run a code for data analysis",
  schema: z.object({
    prompt: z.string(),
   
  }),
  async func({ prompt, }) {

    const instructions = `
      You are a personal math tutor. When asked a math question,
      write and run code using the python tool to answer the question.
      `;

     const resp = await client.responses.create({
        model: "gpt-4.1",
        tools: [
          {
            type: "code_interpreter",
            container: { type: "auto", memory_limit: "4g" },
          },
        ],
        instructions,
        input: prompt
      });


    return resp.output_text ?? "No result from python tool.";

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


