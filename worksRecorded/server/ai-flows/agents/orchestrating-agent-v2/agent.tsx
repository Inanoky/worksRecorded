"use server"

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import {
  readOnlyToolNode,
  readOnlyTools,
  toolNode,
  tools,
} from "@/server/ai-flows/agents/orchestrating-agent-v2/tools";
import { systemPrompt } from "@/server/ai-flows/agents/orchestrating-agent-v2/prompts";
import { orchestratingAgentV2ModelModel } from "@/server/ai-flows/ai-models-settings";
import { requireUser } from "@/lib/utils/requireUser";
import {
  buildAiRunContext,
  getOrchestratingThreadId,
  summarizeForTrace,
} from "@/server/ai-flows/ai-run-context";

const DEBUG_AGENT = process.env.NODE_ENV !== "production";
const MAX_GRAPH_RECURSION = 8;

const state = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!);
let isCheckpointerReady = false;

type OrchestratingAgentRunOptions = {
  userId: string;
  threadId?: string;
  traceMetadata?: Record<string, string | number | boolean | null | undefined>;
  readOnlyTools?: boolean;
  model?: string;
};

export type OrchestratingAgentRunDetails = {
  content: string;
  requestedModel: string;
  actualModel: string | null;
  tokenUsage: unknown;
  usageMetadata: unknown;
  responseMetadata: unknown;
  finishReason: string | null;
};

function createAgentNode(agentTools, model = orchestratingAgentV2ModelModel) {
  return async (currentState) => {
    const { messages } = currentState;

    const llm = new ChatOpenAI({
      model,
    }).bindTools(agentTools);

    const response = await llm.invoke(messages);

    return {
      messages: [response],
    };
  };
}

const shouldContinue = (currentState) => {
  const { messages } = currentState;
  const lastMessage = messages[messages.length - 1];

  if (DEBUG_AGENT) {
    console.log("shouldContinue - lastMessage type:", lastMessage?._getType?.());
  }

  if (
    lastMessage &&
    "tool_calls" in lastMessage &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls.length
  ) {
    return "tools";
  }

  return END;
};

function createWorkflow(agentTools, selectedToolNode, model = orchestratingAgentV2ModelModel) {
  return new StateGraph(state)
    .addNode("agentNode", createAgentNode(agentTools, model))
    .addNode("tools", selectedToolNode)
    .addEdge(START, "agentNode")
    .addConditionalEdges("agentNode", shouldContinue, ["tools", END])
    .addEdge("tools", "agentNode");
}

const graph = createWorkflow(tools, toolNode).compile({ checkpointer });
const readOnlyGraph = createWorkflow(readOnlyTools, readOnlyToolNode).compile({ checkpointer });

async function ensureCheckpointer() {
  if (isCheckpointerReady) {
    return;
  }

  await checkpointer.setup();
  isCheckpointerReady = true;
}

export async function runOrchestratingAgentV2Detailed(
  question,
  siteId,
  options: OrchestratingAgentRunOptions,
): Promise<OrchestratingAgentRunDetails> {
  await ensureCheckpointer();
  const requestedModel = options.model ?? orchestratingAgentV2ModelModel;
  const aiContext = buildAiRunContext({
    flow: "dashboard-chat",
    threadId: options.threadId ?? getOrchestratingThreadId(siteId, options.userId),
    siteId,
    userId: options.userId,
    channel: "dashboard",
    model: requestedModel,
    metadata: {
      questionPreview: summarizeForTrace(question),
      ...(options.traceMetadata ?? {}),
    },
  });

  const config = {
    configurable: {
      thread_id: aiContext.threadId,
    },
    recursionLimit: MAX_GRAPH_RECURSION,
    ...aiContext.runnableConfig,
  };

  const inputs = {
    messages: [
      new SystemMessage(systemPrompt(siteId, options.userId)),
      new HumanMessage(question),
    ],
  };

  let finalState;
  const selectedGraph = options.model
    ? createWorkflow(
        options.readOnlyTools ? readOnlyTools : tools,
        options.readOnlyTools ? readOnlyToolNode : toolNode,
        options.model,
      ).compile({ checkpointer })
    : options.readOnlyTools
      ? readOnlyGraph
      : graph;

  for await (const output of await selectedGraph.stream(inputs, config)) {
    if (DEBUG_AGENT) {
      console.log("Step keys:", Object.keys(output));
    }

    for (const value of Object.values(output)) {
      finalState = value;
    }
  }

  const finalMessage = finalState.messages[finalState.messages.length - 1];
  const responseMetadata = (finalMessage as any)?.response_metadata ?? null;
  const usageMetadata = (finalMessage as any)?.usage_metadata ?? null;

  return {
    content: String((finalMessage as any)?.content ?? ""),
    requestedModel,
    actualModel: responseMetadata?.model_name ?? null,
    tokenUsage: usageMetadata ?? responseMetadata?.tokenUsage ?? null,
    usageMetadata,
    responseMetadata,
    finishReason: responseMetadata?.finish_reason ?? null,
  };
}

export async function runOrchestratingAgentV2(
  question,
  siteId,
  options: OrchestratingAgentRunOptions,
) {
  const result = await runOrchestratingAgentV2Detailed(question, siteId, options);
  return result.content;
}

export default async function OrchestratingAgentV2(question, siteId, traceMetadata = {}) {
  const user = await requireUser();
  return runOrchestratingAgentV2(question, siteId, {
    userId: user.id,
    traceMetadata,
  });
}
