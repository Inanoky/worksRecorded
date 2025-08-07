"use server"
import {Annotation, END, START, StateGraph} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import {BaseMessage, HumanMessage, SystemMessage} from "@langchain/core/messages";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import {systemPrompt} from "@/components/AI/Whatsapp/prompts";
import {toolNode, tools} from "@/components/AI/Whatsapp/tools";

export default async function talkToWhatsappAgent(question, siteId) {
    console.log("=== talkToWhatsappAgent called ===");
    console.log("Question:", question, "SiteId:", siteId);

    const state = Annotation.Root({
        messages: Annotation<BaseMessage[]>({
            reducer: (x, y) => x.concat(y),
            default: () => [],
        }),
    });

    const shouldContinue = (state) => {
        const { messages } = state;
        const lastMessage = messages[messages.length - 1];
        console.log("shouldContinue - lastMessage:", lastMessage);

        if (lastMessage && "tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length) {
            console.log("shouldContinue: Detected tool_calls, going to 'tools'");
            return "tools";
        }
        console.log("shouldContinue: No tool_calls, going to END");
        return END;
    };

    const agent = async (state) => {
        const { messages } = state;
        console.log("agent node - messages to model:", messages);

        const llm = new ChatOpenAI({
            temperature: 0.5,
            model: "gpt-4.1",
        }).bindTools(tools);

        const response = await llm.invoke(messages);

        console.log("agent node - LLM response:", response);

        return {
            messages: [response]
        };
    };

    const workflow = new StateGraph(state)
        .addNode("agent", agent)
        .addNode("tools", toolNode)
        .addEdge(START, "agent")
        .addConditionalEdges("agent", shouldContinue, ["tools", END])
        .addEdge("tools", END)
        .addEdge("tools", "agent") // <--- loop back to agent!

    const checkpointer = PostgresSaver.fromConnString(
        process.env.DATABASE_URL
    );

    await checkpointer.setup();
    const config = { configurable: { thread_id: siteId} };



    const graph = workflow.compile({ checkpointer });

    const inputs = {
        messages: [
            new SystemMessage(systemPrompt),
            new HumanMessage(question),
        ],
    };

    console.log("Graph initial inputs:", JSON.stringify(inputs, null, 2));

    let finalState;
    let lastMsg;

    for await (const output of await graph.stream(inputs, config)) {
        console.log("Step/Run full output:", JSON.stringify(output, null, 2));
        for (const [key, value] of Object.entries(output)) {
            lastMsg = value.messages[value.messages.length - 1];
            finalState = value;
            console.log(`Current node: ${key}`);
            console.log("Last message at node:", lastMsg);
        }
    }

    if (finalState && finalState.messages && finalState.messages.length > 0) {
        console.log("AI content:", finalState.messages[0].content);
        return finalState.messages[0].content;
    } else {
        console.log("No final AI message content produced.");
        return null;
    }
}
