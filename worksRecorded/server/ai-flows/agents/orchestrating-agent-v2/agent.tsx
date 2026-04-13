"use server"

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { tools, toolNode } from "@/server/ai-flows/agents/orchestrating-agent-v2/tools";
import { systemPrompt } from "@/server/ai-flows/agents/orchestrating-agent-v2/prompts";
import { orchestratingAgentV2ModelModel } from "@/server/ai-flows/ai-models-settings";
import { requireUser } from "@/lib/utils/requireUser";

const DEBUG_AGENT = process.env.NODE_ENV !== "production";
const MAX_GRAPH_RECURSION = 8;

const state = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL);
let isCheckpointerReady = false;

const agentNode = async (currentState) => {
  const { messages } = currentState;

  const llm = new ChatOpenAI({
    model: orchestratingAgentV2ModelModel,
  }).bindTools(tools);

  const response = await llm.invoke(messages);

  return {
    messages: [response],
  };
};

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

const workflow = new StateGraph(state)
  .addNode("agentNode", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agentNode")
  .addConditionalEdges("agentNode", shouldContinue, ["tools", END])
  .addEdge("tools", "agentNode");

const graph = workflow.compile({ checkpointer });

async function ensureCheckpointer() {
  if (isCheckpointerReady) {
    return;
  }

  await checkpointer.setup();
  isCheckpointerReady = true;
}

export default async function OrchestratingAgentV2(question, siteId) {
  const user = await requireUser();
  await ensureCheckpointer();

  const config = {
    configurable: {
      thread_id: `orchestrating-agent-v2:${siteId}:${user.id}`,
    },
    recursionLimit: MAX_GRAPH_RECURSION,
  };

  const inputs = {
    messages: [
      new SystemMessage(systemPrompt(siteId, user.id)),
      new HumanMessage(question),
    ],
  };

  let finalState;

  for await (const output of await graph.stream(inputs, config)) {
    if (DEBUG_AGENT) {
      console.log("Step keys:", Object.keys(output));
    }

    for (const value of Object.values(output)) {
      finalState = value;
    }
  }

  return finalState.messages[finalState.messages.length - 1].content;
}
