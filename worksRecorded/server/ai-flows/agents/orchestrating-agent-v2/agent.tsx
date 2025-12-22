"use server";

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { tools, toolNode } from "@/server/ai-flows/agents/orchestrating-agent-v2/tools";
import { systemPrompt } from "@/server/ai-flows/agents/orchestrating-agent-v2/prompts";
import { orchestratingAgentV2ModelModel } from "@/server/ai-flows/ai-models-settings";
import { requireUser } from "@/lib/utils/requireUser";

function shortMsg(m: any) {
  return {
    _type: m?._getType?.() ?? m?.constructor?.name,
    contentPreview: typeof m?.content === "string" ? m.content.slice(0, 200) : m?.content,
    toolCallsCount: Array.isArray(m?.tool_calls) ? m.tool_calls.length : 0,
    toolCallIds: Array.isArray(m?.tool_calls) ? m.tool_calls.map((c: any) => c.id) : [],
    toolCallNames: Array.isArray(m?.tool_calls) ? m.tool_calls.map((c: any) => c.name) : [],
  };
}

export default async function OrchestratingAgentV2(question: string, siteId: string) {
  const runId = `orchestratingAgentV2:${siteId}:${Date.now()}`;
  console.log(`[${runId}] START`, { siteId, questionPreview: question?.slice(0, 200) });

  const user = await requireUser();

  const state = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y),
      default: () => [],
    }),
  });

  const agentNode = async (state: any) => {
    try {
      const { messages } = state;
      console.log(`[${runId}] agentNode:in`, {
        messagesLen: messages?.length ?? 0,
        last: messages?.length ? shortMsg(messages[messages.length - 1]) : null,
      });

      const llm = new ChatOpenAI({
        model: orchestratingAgentV2ModelModel,
      }).bindTools(tools);

      console.log(`[${runId}] agentNode:llm.invoke:start`);
      const response = await llm.invoke(messages);
      console.log(`[${runId}] agentNode:llm.invoke:done`, shortMsg(response));

      return { messages: [response] };
    } catch (e: any) {
      console.error(`[${runId}] agentNode:CRASH`, e?.stack ?? e);
      throw e;
    }
  };

  const shouldContinue = (state: any) => {
    const { messages } = state;
    const lastMessage: any = messages[messages.length - 1];
    const hasToolCalls =
      lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls.length > 0;

    console.log(`[${runId}] shouldContinue`, {
      hasToolCalls,
      last: shortMsg(lastMessage),
    });

    return hasToolCalls ? "tools" : END;
  };

  const toolsWrapperNode = async (state: any) => {
    try {
      const { messages } = state;
      const last: any = messages[messages.length - 1];

      console.log(`[${runId}] toolsNode:in`, {
        messagesLen: messages?.length ?? 0,
        last: shortMsg(last),
      });

      if (Array.isArray(last?.tool_calls) && last.tool_calls.length) {
        console.log(`[${runId}] toolsNode:tool_calls`, {
          ids: last.tool_calls.map((c: any) => c.id),
          names: last.tool_calls.map((c: any) => c.name),
          argsPreview: last.tool_calls.map((c: any) => {
            const a = c.args ?? {};
            const s = JSON.stringify(a);
            return s.length > 300 ? s.slice(0, 300) + "..." : s;
          }),
        });
      }

      console.log(`[${runId}] toolsNode:ToolNode.invoke:start`);
      const out = await toolNode.invoke(state);
      console.log(`[${runId}] toolsNode:ToolNode.invoke:done`, {
        outMessagesLen: out?.messages?.length ?? 0,
        outLast: out?.messages?.length ? shortMsg(out.messages[out.messages.length - 1]) : null,
      });

      return out;
    } catch (e: any) {
      console.error(`[${runId}] toolsNode:CRASH`, e?.stack ?? e);
      throw e;
    }
  };

  const workflow = new StateGraph(state)
    .addNode("agentNode", agentNode)
    .addNode("tools", toolsWrapperNode)
    .addEdge(START, "agentNode")
    .addConditionalEdges("agentNode", shouldContinue, ["tools", END])
    .addEdge("tools", "agentNode");

  const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL);
  await checkpointer.setup();

  const config = {
    configurable: {
      thread_id: "orchestrating-agent-v2:" + siteId,
    },
  };

  const graph = workflow.compile({ checkpointer });

  const inputs = {
    messages: [
      new SystemMessage(systemPrompt(siteId, user.id)),
      new HumanMessage(question),
    ],
  };

  let finalState: any;

  try {
    for await (const output of await graph.stream(inputs, config)) {
      console.log(`[${runId}] stream:step`, Object.keys(output));

      for (const [key, value] of Object.entries(output as any)) {
        const msgs = (value as any)?.messages ?? [];
        console.log(`[${runId}] stream:node=${key}`, {
          messagesLen: msgs.length,
          last: msgs.length ? shortMsg(msgs[msgs.length - 1]) : null,
        });
        finalState = value;
      }
    }
  } catch (e: any) {
    console.error(`[${runId}] GRAPH:CRASH`, e?.stack ?? e);
    throw e;
  }

  const last = finalState?.messages?.[finalState.messages.length - 1];
  console.log(`[${runId}] END`, { last: shortMsg(last) });

  return last?.content ?? "";
}
