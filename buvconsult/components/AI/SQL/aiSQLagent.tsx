"use server"

// aiSQLagent.tsx

import {  StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import {constructionCategories} from "@/components/AI/SQL/ConstructionCategories";
import {
    allowedFieldKeysPrompt,
    databaseSchema,

    SQLConstructSystemPrompt,
    SQLFormatSystemPrompt, stateDefault
} from "@/components/AI/SQL/Prompts";
import {memory1} from "@/components/AI/SQL/Memories";

export default async function aiSQLAgent(stateReceived){

const state = stateDefault

//Below are technical for validations.

const allowedFieldKeys = allowedFieldKeysPrompt


const schema = databaseSchema






// So below will be an agent




const SQLconstruct = async (state) => {

    const llm = new ChatOpenAI({
        temperature: 0.8,
        model: "gpt-4.1",


    });

    const structuredLlm = llm.withStructuredOutput(
        z.object({
            sql : z.string().describe("valid single SQL query"),

            reason: z.string().describe("explain if SQL query you made is valid or not")

        })
    )

    const prompt =
        `
        User question: ${state.question}            
    `;

    const response = await structuredLlm.invoke(

        [
            ["system", `Useful memories : ${memory1} \n ${SQLConstructSystemPrompt} \n Schema : ${schema} \n Categories : ${JSON.stringify(constructionCategories)}`],
            ["human", prompt]
        ]);

    //So here we just return SQL. Basically we can pass it on to aiDBsearcher

     console.log("SQLconstruct  : ", response)
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



