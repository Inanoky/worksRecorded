"use server"

//C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\componentsFrontend\AI\BuvconsultAgent\InvoicesAgent\InvoicesAgent.tsx
import {Annotation, END, START, StateGraph, } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

import {BaseMessage, HumanMessage, SystemMessage} from "@langchain/core/messages";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import {tools, toolNode} from "@/server/ai-flows/agents/timeshets-agent/Tools"
import {systemPrompt} from "@/server/ai-flows/agents/timeshets-agent/prompts";
import { timeSheetsAgentModel, } from "@/server/ai-flows/ai-models-settings";
import {
    buildAiRunContext,
    getTimesheetsAgentThreadId,
    summarizeForTrace,
} from "@/server/ai-flows/ai-run-context";





export default async function TimesheetsAgent(question,siteId){
const aiContext = buildAiRunContext({
    flow: "timesheets-agent",
    threadId: getTimesheetsAgentThreadId(siteId),
    siteId,
    channel: "agent",
    model: timeSheetsAgentModel,
    metadata: {
        questionPreview: summarizeForTrace(question),
    },
});

//--------------------------State----------------------------------

const state = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [], }),
    });

//--------------------------Nodes----------------------------------







const agentNode = async (state) => {

    const { messages } = state;

    const llm = new ChatOpenAI({
       
        model: timeSheetsAgentModel ,
    }).bindTools(tools);
    ;


    const response = await llm.invoke(messages, {
        ...aiContext.runnableConfig,
        runName: "TimesheetsAgentModel",
    });


        return {
        messages: [response]
         };
};




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













//---------------------------Graph routing----------------------------------


     const workflow = new StateGraph(state)
            .addNode("agentNode", agentNode)
            .addNode("tools", toolNode)
            .addEdge(START, "agentNode")
            .addConditionalEdges("agentNode", shouldContinue, ["tools", END])            
            .addEdge("tools", "agentNode") // <--- loop back to agent!
    


    const checkpointer = PostgresSaver.fromConnString(
        process.env.DATABASE_URL!
    );


    await checkpointer.setup();
    
    const config = {
        configurable: {thread_id: aiContext.threadId},
        ...aiContext.runnableConfig,
    }; // Unique thread ID per site




    const graph = workflow.compile({checkpointer})

    const inputs = {
         messages: [
            new SystemMessage(systemPrompt(siteId)),
            new HumanMessage(question),
        ],
    };

    console.log(inputs)

    let finalState;

    for await (const output of await graph.stream(inputs, config)) {
        console.log("Step/Run full output:", output);
        for (const [key, value] of Object.entries(output)) {
            const lastMsg = output[key].messages[output[key].messages.length - 1];
            finalState = value;
        }
    }

    if (!finalState?.messages?.length) return "No timesheets agent response.";

    //return the last AI message
    return finalState.messages[finalState.messages.length - 1].content;

}

// await InvoiceAgent("Can you also give me some insights about companies, what kind of companies are involved in this project, what do they sell","123")





