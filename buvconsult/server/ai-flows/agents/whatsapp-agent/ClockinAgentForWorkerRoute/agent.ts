"use server"
import {Annotation, END, START, StateGraph} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, SystemMessage, ToolCall } from "@langchain/core/messages";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import { systemPromptFunction } from "@/server/ai-flows/agents/whatsapp-agent/ClockinAgentForWorkerRoute/prompts";
import {toolNode, tools } from "@/server/ai-flows/agents/whatsapp-agent/ClockinAgentForWorkerRoute/tools"
import { getSiteIdByWorkerId, isWorkerClockedIn} from "@/server/actions/timesheets-actions";
import { clickInAgentForWorkersModel, clockInAgentForWorkersModelTemperature } from "@/server/ai-flows/ai-models-settings";





export default async function talkToClockInAgent(question, workerId) {
    console.log("=== talkToWhatsappAgent called ===");

    const siteId = await getSiteIdByWorkerId(workerId)
    console.log(siteId)

    const status = (await isWorkerClockedIn(workerId)).isClockedIn ? "clocked In" : "clocked Out";

    console.log(`Worker is currently ${status}`)

    const nowISO = new Date().toISOString();


    console.log("Question:", question, "WorkerId", workerId, "SiteId" , siteId);

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
        
        // UPDATE: Cast lastMessage to check for tool_calls property
        const lastMessageWithTools = lastMessage as any; 

        if (lastMessageWithTools && "tool_calls" in lastMessageWithTools && Array.isArray(lastMessageWithTools.tool_calls) && lastMessageWithTools.tool_calls.length) {
            
            // NEW: Inject missing siteId, workerId, and date into tool calls if needed.
            // This is crucial for the new workerDiaryToDatabaseTool.
            for (const toolCall of lastMessageWithTools.tool_calls as ToolCall[]) {
                if (toolCall.function.name === "WorkerDiaryToDatabase" || toolCall.function.name === "ClockInWorker") {
                    try {
                        const args = JSON.parse(toolCall.function.arguments);
                        if (!args.workerId) args.workerId = workerId;
                        if (!args.siteId) args.siteId = siteId;
                        // NEW: Inject current date/time for diary tool
                        if (toolCall.function.name === "WorkerDiaryToDatabase" && !args.date) {
                            args.date = nowISO; 
                        }
                        toolCall.function.arguments = JSON.stringify(args);
                    } catch (e) {
                        console.error("Error modifying tool arguments:", e);
                    }
                }
            }

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
            temperature: clockInAgentForWorkersModelTemperature,
            model: clickInAgentForWorkersModel,
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
    const config = { configurable: { thread_id: workerId} };



    const graph = workflow.compile({ checkpointer });

    const systemPrompt = systemPromptFunction(siteId, workerId, status)

    const inputs = {
        messages: [
            new SystemMessage(await systemPrompt),
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
