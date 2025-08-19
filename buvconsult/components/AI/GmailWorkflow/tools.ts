import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import {retriever} from "@/components/AI/RAG/LanggraphAgentVersion/retrievers";
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {GraphState} from "@/components/AI/RAG/LanggraphAgentVersion/state";


export const retrieverTool = new DynamicStructuredTool({
  name: "retriever",
  description: "Retrieve and rerank relevant docs for a given question and site.",
  schema: z.object({
    prompt: z.string(),
    siteId: z.string(),
  }),
  async func({ prompt, siteId }) {
    return await retriever(prompt, siteId);
  },
});


export const tools = [retrieverTool]

export const toolNode = new ToolNode<typeof GraphState.State>(tools)


