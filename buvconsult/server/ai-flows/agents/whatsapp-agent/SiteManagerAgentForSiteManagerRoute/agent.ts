"use server"
import {Annotation, END, START, StateGraph} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {BaseMessage, HumanMessage, SystemMessage} from "@langchain/core/messages";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import { systemPromptFunction} from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/prompts"
import {toolNode, tools} from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/tools";

export default async function talkToWhatsappAgent(question, siteId, userId) {
    console.log("=== talkToWhatsappAgent called ===");
   

   

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
       
        const llm = new ChatOpenAI({
            temperature: 0.1,
            model: "gpt-4.1",
        }).bindTools(tools);

        const response = await llm.invoke(messages);

       

        return {
            messages: [response]
        };
    };

    const workflow = new StateGraph(state)
        .addNode("agent", agent)
        .addNode("tools", toolNode)
        .addEdge(START, "agent")
        .addConditionalEdges("agent", shouldContinue, ["tools", END])       
        .addEdge("tools", "agent") // <--- loop back to agent!

    const checkpointer = PostgresSaver.fromConnString(
        process.env.DATABASE_URL
    );

    await checkpointer.setup();
    const config = { configurable: { thread_id: `siteManager${siteId}`} };



    const graph = workflow.compile({ checkpointer });

    const systemPrompt = systemPromptFunction(siteId,userId)

    const inputs = {
        messages: [
            new SystemMessage(await systemPrompt),
            new HumanMessage(question),
        ],
    };



    let finalState;
    let lastMsg;

    for await (const output of await graph.stream(inputs, config)) {
        
        for (const [key, value] of Object.entries(output)) {
            lastMsg = value.messages[value.messages.length - 1];
            finalState = value;
            
        }
    }

    if (finalState && finalState.messages && finalState.messages.length > 0) {
        
        return finalState.messages[0].content;
    } else {
       
        return null;
    }
}
