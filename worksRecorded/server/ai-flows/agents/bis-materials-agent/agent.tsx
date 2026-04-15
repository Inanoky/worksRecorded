"use server"

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { tools, toolNode } from "@/server/ai-flows/agents/bis-materials-agent/Tools";
import { systemPrompt } from "@/server/ai-flows/agents/bis-materials-agent/Prompts";
import { siteDiaryAgentModel } from "@/server/ai-flows/ai-models-settings";

export default async function BisMaterialsAgent(question, siteId) {
  const state = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y),
      default: () => [],
    }),
  });

  const agentNode = async (state) => {
    const { messages } = state;

    const llm = new ChatOpenAI({
      model: siteDiaryAgentModel,
    }).bindTools(tools);

    const response = await llm.invoke(messages);

    return {
      messages: [response],
    };
  };

  const shouldContinue = (state) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];

    if (lastMessage && "tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length) {
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

  const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL);
  await checkpointer.setup();

  const config = { configurable: { thread_id: `${siteId}_BisMaterialsAgent` } };
  const graph = workflow.compile({ checkpointer });

  const inputs = {
    messages: [
      new SystemMessage(systemPrompt(siteId)),
      new HumanMessage(question),
    ],
  };

  let finalState;

  for await (const output of await graph.stream(inputs, config)) {
    for (const [, value] of Object.entries(output)) {
      finalState = value;
    }
  }

  return finalState.messages[finalState.messages.length - 1].content;
}
