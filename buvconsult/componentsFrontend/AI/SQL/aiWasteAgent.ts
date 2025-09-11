"use server"

// aiSQLagent.tsx

import {  StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import {constructionCategories} from "@/componentsFrontend/AI/SQL/ConstructionCategories";
import {
    aiWasteAnalysisPrompt,
    allowedFieldKeysPrompt,
    databaseSchema,

    SQLConstructSystemPrompt,
    SQLFormatSystemPrompt, stateDefault
} from "@/componentsFrontend/AI/SQL/Prompts";

export default async function aiWasteAgent(stateReceived){


const state = stateDefault

//Below are technical for validations.




const schema = databaseSchema






// So below will be an agent




const SQLconstruct = async (state) => {

    const llm = new ChatOpenAI({
        
        model: "gpt-4.1",
        temperature: 0.1,


    });

    const structuredLlm = llm.withStructuredOutput(
        z.object({
            sql : z.string().describe(`valid single SQL query`),
            reason: z.string().describe("based on what you made your decisions")

        })
    )

    const prompt = `Schema:\n${schema}\nUser question: ${state.message}\nWrite a valid PostgreSQL SQL query (no explanation).
    categories : ${JSON.stringify(constructionCategories)}`;

    const response = await structuredLlm.invoke([
        ["system", aiWasteAnalysisPrompt],
        ["human", prompt]]);

    //So here we just return SQL. Basically we can pass it on to aiDBsearcher

    console.log("SQLconstruct  ", response)
    return {
        ...state,
        sql: response.sql,
    };
};









const workflow = new StateGraph(state)


    .addNode("sql-construct", SQLconstruct)
    .addEdge("__start__", "sql-construct")
    .addEdge("sql-construct", "__end__")


const graph = workflow.compile()




const graphResult = await graph.invoke({

     ...stateReceived
     })


return graphResult


}



