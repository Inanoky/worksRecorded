"use server"
import {Annotation, StateGraph} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import {BaseMessage, HumanMessage, SystemMessage} from "@langchain/core/messages";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import {toolNode} from "@/components/AI/RAG/LanggraphAgentVersion/tools";






export default async function talkToAgent(question,siteId){

const systemPrompt = "You are a helpful assistant"

const state = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [], }),
    });


const agent = async (state) => {

    const { messages } = state;

    const llm = new ChatOpenAI({
        temperature: 0.5,
        model: "gpt-4.1",


    });


    const response = await llm.invoke(messages);


    // console.log("generalQuestion  ", response)
    return {
        messages: [response]
         };
};



    const workflow = new StateGraph(state)



        .addNode("generalQuestion", agent)
        .addEdge("__start__", "generalQuestion")
        .addEdge("generalQuestion","__end__")



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

await talkToAgent("What is my name?","123")

