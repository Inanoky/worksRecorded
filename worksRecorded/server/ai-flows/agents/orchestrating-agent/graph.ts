"use server"

import {END, StateGraph} from "@langchain/langgraph";
import { START } from "@langchain/langgraph";
import {GraphState} from "@/server/ai-flows/agents/shared-between-agents/state";
import {
    agent, checkRelevance,
    generate,
    gradeDocuments,
    rewrite,
    shouldRetrieve
} from "@/server/ai-flows/agents/orchestrating-agent/agent";
import {toolNode} from "@/server/ai-flows/agents/orchestrating-agent/tools";
import {HumanMessage, SystemMessage} from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import {talkToAgentPrompts} from "@/server/ai-flows/agents/orchestrating-agent/prompts";






export async function talkToAgent(input,siteId) {

    console.log("Graph invoked")


    const workflow = new StateGraph(GraphState)
        
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


    const checkpointer = PostgresSaver.fromConnString(
        process.env.DATABASE_URL
    );



    await checkpointer.setup();

 

    const config = {configurable: {thread_id: `orchestrating${siteId}`}};




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