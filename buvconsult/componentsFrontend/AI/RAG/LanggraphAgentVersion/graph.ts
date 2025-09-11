"use server"

import {END, StateGraph} from "@langchain/langgraph";
import { START } from "@langchain/langgraph";
import {GraphState} from "@/componentsFrontend/AI/RAG/LanggraphAgentVersion/state";
import {
    agent, checkRelevance,
    generate,
    gradeDocuments,
    rewrite,
    shouldRetrieve
} from "@/componentsFrontend/AI/RAG/LanggraphAgentVersion/edges";
import {toolNode} from "@/componentsFrontend/AI/RAG/LanggraphAgentVersion/tools";
import {HumanMessage, SystemMessage} from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import {talkToAgentPrompts} from "@/componentsFrontend/AI/RAG/LanggraphAgentVersion/LanggraphAgentVersionPrompts";


//So this code below supposed to filter just conversation from Checkpointer



export async function talkToAgent(input,siteId) {

// Define the graph
    const workflow = new StateGraph(GraphState)
        // Define the nodes which we'll cycle between.
        .addNode("agent", agent)
        .addNode("retrieve", toolNode)
        .addNode("gradeDocuments", gradeDocuments)
        .addNode("rewrite", rewrite)
        .addNode("generate", generate)
        .addEdge(START, "agent")
        .addConditionalEdges(
            "agent",
            // Assess agent decision
            shouldRetrieve,
        )
        .addEdge("retrieve", "gradeDocuments")
        .addConditionalEdges(        "gradeDocuments", checkRelevance,
        {
            // Call tool node
            yes: "generate",
            no: "rewrite", // placeholder
        },).addEdge("generate", END)
        .addEdge("rewrite", "agent");

//So this is memroy
    const checkpointer = PostgresSaver.fromConnString(
        process.env.DATABASE_URL
    );

    // console.log(process.env.DIRECT_URL)

    await checkpointer.setup();

//Here we need to create thread_id if doesn't exist and fetch from db if does exist.

// we use site ID for this checkpointer. 

    const config = {configurable: {thread_id: siteId }};



// Decide whether to retrieve




// Edges taken after the `action` node is called.








// Compile
    const app = workflow.compile({checkpointer});


    const inputs = {
        messages: [
            new SystemMessage(` ${talkToAgentPrompts} \n SiteId : ${siteId}`),
            new HumanMessage(
                input
            ),
        ],
    };


    let finalState;

    for await (const output of await app.stream(inputs, config)) {
        console.log("Step/Run full output:", output);
        for (const [key, value] of Object.entries(output)) {
            const lastMsg = output[key].messages[output[key].messages.length - 1];
            // console.log(`Output from node: '${key}'`);
            // console.dir({
            //     type: lastMsg._getType(),
            //     content: lastMsg.content,
            //     tool_calls: lastMsg.tool_calls,
            // }, {depth: null});
            // console.log("---\n");
            finalState = value;
        }
    }



    const content = finalState.messages[0].content;

    return content;

}