import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import {retriever} from "@/componentsFrontend/AI/RAG/LanggraphAgentVersion/retrievers";
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {GraphState} from "@/componentsFrontend/AI/RAG/LanggraphAgentVersion/state";
import aiGeneral from "@/componentsFrontend/AI/SQL/aiGeneral";
import InvoiceAgent from "../../BuvconsultAgent/InvoicesAgent/InvoicesAgent";
import SiteDiaryAgent from "../../BuvconsultAgent/SiteDiaryAgent/SiteDiaryAgent";
import TimesheetsAgent from "../../BuvconsultAgent/TimeSheetsAgent/TimeSheetsAgent";

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





export const tools = [constructionDocumentationTool,invoiceAgentTool,siteDiaryRecordsTool,timeSheetsAgent]

export const toolNode = new ToolNode<typeof GraphState.State>(tools)


