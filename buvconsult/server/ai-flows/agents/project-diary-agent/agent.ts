// components/AI/ProjectDiary/agent.ts
"use server";

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { systemPromptFunction } from "@/server/ai-flows/agents/project-diary-agent/prompts";
import { toolNode, tools } from "@/server/ai-flows/agents/project-diary-agent/tools"
import { projectDiaryAgentModel,projectDiaryAgentModelTemperature } from "@/server/ai-flows/ai-models-settings";


export default async function talkToProjectDiaryAgent(
  question: string,
  siteId: string,
  userId: string
) {
  const state = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y),
      default: () => [],
    }),
  });

  const shouldContinue = (s: { messages: BaseMessage[] }) => {
    const last = s.messages[s.messages.length - 1] as any;
    return last && Array.isArray(last.tool_calls) && last.tool_calls.length ? "tools" : END;
  };

  const agent = async (s: { messages: BaseMessage[] }) => {
    const llm = new ChatOpenAI({ temperature: projectDiaryAgentModelTemperature, model: projectDiaryAgentModel }).bindTools(tools);
    const response = await llm.invoke(s.messages);
    return { messages: [response] };
  };

  const workflow = new StateGraph(state)
    .addNode("agent", agent)
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, ["tools", END])
    .addEdge("tools", "agent"); // loop back after tool execution

  const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!);
  await checkpointer.setup();

  const config = { configurable: { thread_id: `ProjectDiary_${siteId}` } };
  const graph = workflow.compile({ checkpointer });

  const sysPrompt = systemPromptFunction(siteId, userId);

  const inputs = {
    messages: [new SystemMessage(await sysPrompt), new HumanMessage(question)],
  };

  let finalState: any;
  for await (const output of await graph.stream(inputs, config)) {
    for (const [, value] of Object.entries(output)) {
      finalState = value;
    }
  }

  if (finalState?.messages?.length) {
    const last = finalState.messages[finalState.messages.length - 1] as BaseMessage;
    // Return final assistant text content, fallback stringifying message if needed.
    // @ts-ignore
    return typeof last.content === "string" ? last.content : JSON.stringify(last.content);
  }
  return null;
}
