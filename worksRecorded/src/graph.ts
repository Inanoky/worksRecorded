import { BaseMessage, SystemMessage } from "@langchain/core/messages";
import { Annotation, END, START, StateGraph, messagesStateReducer } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

import {
  toolNode,
  tools,
} from "@/server/ai-flows/agents/orchestrating-agent-v2/tools";
import { prepareDashboardModelMessages } from "@/server/ai-flows/agents/orchestrating-agent-v2/messageHistory";
import { systemPrompt } from "@/server/ai-flows/agents/orchestrating-agent-v2/prompts";
import { orchestratingAgentV2ModelModel } from "@/server/ai-flows/ai-models-settings";
import {
  buildControlledMemoryMessagesUpdate,
  getControlledMemoryMetadata,
} from "@/server/ai-flows/controlled-memory";

const DEFAULT_DEV_SITE_ID = process.env.LANGGRAPH_DEV_SITE_ID ?? "langgraph-dev-site";
const DEFAULT_DEV_USER_ID = process.env.LANGGRAPH_DEV_USER_ID ?? "langgraph-dev-user";

const DashboardDevState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

function hasSystemMessage(messages: BaseMessage[]) {
  return messages.some((message) => message.getType?.() === "system");
}

function getConfigString(config: any, key: string, fallback: string) {
  const value = config?.configurable?.[key] ?? config?.metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

async function dashboardAgentNode(currentState: typeof DashboardDevState.State, config?: any) {
  const siteId = getConfigString(config, "siteId", DEFAULT_DEV_SITE_ID);
  const userId = getConfigString(config, "userId", DEFAULT_DEV_USER_ID);
  const model = getConfigString(config, "model", orchestratingAgentV2ModelModel);
  const messages = hasSystemMessage(currentState.messages)
    ? currentState.messages
    : [
        new SystemMessage(systemPrompt(siteId, userId)),
        ...currentState.messages,
      ];

  const { messages: preparedMessages, stats } = prepareDashboardModelMessages(messages);

  const llm = new ChatOpenAI({ model }).bindTools(tools);
  const response = await llm.invoke(preparedMessages, {
    ...config,
    runName: "DashboardAgentDevModel",
    metadata: {
      ...config?.metadata,
      siteId,
      userId,
      model,
      langGraphDev: true,
      ...getControlledMemoryMetadata(stats),
    },
  });

  return {
    messages: buildControlledMemoryMessagesUpdate(preparedMessages, response),
  };
}

function shouldContinue(currentState: typeof DashboardDevState.State) {
  const lastMessage = currentState.messages[currentState.messages.length - 1] as any;
  return Array.isArray(lastMessage?.tool_calls) && lastMessage.tool_calls.length > 0
    ? "tools"
    : END;
}

export const dashboardAgent = new StateGraph(DashboardDevState)
  .addNode("agentNode", dashboardAgentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agentNode")
  .addConditionalEdges("agentNode", shouldContinue, ["tools", END])
  .addEdge("tools", "agentNode")
  .compile();

export default dashboardAgent;
