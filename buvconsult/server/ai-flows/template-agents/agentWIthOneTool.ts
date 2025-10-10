"use server"
import {Annotation, StateGraph, START, END} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import {BaseMessage, HumanMessage, SystemMessage} from "@langchain/core/messages";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import {tools, toolNode} from "./defaultTool"






export default async function agentWithOneTool(question,siteId){

const systemPrompt = "You are a helpful assistant"

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
        temperature: 0.1,
        model: "gpt-4.1",
    }).bindTools(tools);
    ;


    const response = await llm.invoke(messages);


    // console.log("generalQuestion  ", response)
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
            .addEdge("tools", END)
            .addEdge("tools", "agentNode") // <--- loop back to agent!
    



    const checkpointer = PostgresSaver.fromConnString(
        process.env.DATABASE_URL
    );


    await checkpointer.setup();
    const config = {configurable: {thread_id: "change_this_to_something"}};




    const graph = workflow.compile({checkpointer})

    const inputs = {
         messages: [
            new SystemMessage(systemPrompt),
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



}

await agentWithOneTool("My name is Slava","123")


await agentWithOneTool("What is my name?","123")
