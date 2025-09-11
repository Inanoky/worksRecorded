"use server"


import {  StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import {call_db_agentSchemPrompt, generalQuestionPrompts, stateDefault} from "@/componentsFrontend/AI/SQL/Prompts";
import {prisma} from "@/app/utils/db";
import {requireUser} from "@/app/utils/requireUser";
import aiWasteAgent from "@/componentsFrontend/AI/SQL/aiWasteAgent";
import aiSQLAgent from "@/componentsFrontend/AI/SQL/aiSQLagent";
import aiDBsearch from "@/componentsFrontend/AI/SQL/aiDBsearcher";

export default async function aiGeneral(question,siteId){

// console.log(`this is from aiGeneral, request received`)


const state = stateDefault

const generalQuestion = async (state) => {


    const llm = new ChatOpenAI({
        temperature: 0.5,
        model: "gpt-4.1",


    });

    const structuredLlm = llm.withStructuredOutput(
        z.object({
            answer: z.string().describe("Give your answer"),
            choose_agent_to_call : z.enum(["call_db_agent","call_waste_analysis_agent","no"]).describe(call_db_agentSchemPrompt),
            reason: z.string().describe("Give your reason for your decision"),
            message: z.string().describe("prompt for next agent")

        })
    );

    const response = await structuredLlm.invoke([
        ["human", `${state.message}`],
        ["system",generalQuestionPrompts ]]);


    // console.log("generalQuestion  ", response)
    return {
        ...state,
        question: question,
        message: response.message,
        siteId: siteId,
        choose_agent_to_call : response.choose_agent_to_call,
        aiComment : response.answer
        //Here we can store User message I think
    };
};





const aiSQLAgentCall = async (state) => {


    const response = await aiSQLAgent(state) //Passing just user question to SQL agent

    //Here I just need back SQL query

    // console.log("aiSQLAgentCall ", response)
    return {
        ...response
    }



};


const aiWasteAgentCall = async (state) => {


    const response = await aiWasteAgent(state) //Passing just user question to SQL agent

    //Here I just need back SQL query

    console.log("aiWasteAgentCall : ", response)

    return {

        ...response
    }



};


const aiDBsearchCall = async (state) => {




    const response = await aiDBsearch(state) //Passing just user question to SQL agent

    // aiDBsearch will execute SQL

    // I basically need back data for table and summary from AI

    // console.log("aiDBsearchCall : ", response.message)

    return {
        ...response
    }


};




const workflow = new StateGraph(state)



    .addNode("generalQuestion", generalQuestion)
    .addNode("aiSQLAgentCall", aiSQLAgentCall)
    .addNode("aiWasteAgentCall", aiWasteAgentCall)
    .addNode("aiDBsearchCall",aiDBsearchCall)
    .addEdge("__start__", "generalQuestion")
    .addConditionalEdges("generalQuestion", (state) => {
              if (state.choose_agent_to_call === "call_db_agent") return "aiSQLAgentCall";
              if (state.choose_agent_to_call === "call_waste_analysis_agent") return "aiWasteAgentCall";
              return "__end__"; // e.g., if "no" or anything else
})

    .addEdge("aiSQLAgentCall","aiDBsearchCall")
    // .addEdge("aiSQLAgentCall","__end__")
    .addEdge("aiWasteAgentCall","aiDBsearchCall")
    .addEdge("aiDBsearchCall","__end__")





const graph = workflow.compile()



//Checking if user is authenticated
const user = await requireUser()


//Fetching conversation from database

// let conversation = await prisma.aIconversation.findUnique({
//     where: {
//         userId_siteId: {
//             userId: user.id,
//             siteId: siteId
//         }
//     }
// });

//If no conversation found, we create an empty array, if exist, we load it to history

// let history = conversation?.thread || []; //If conversation is emtpy, we create history - an empty array
// let prompt = `history conversation is here : ${JSON.stringify(history)} and the current question is ${question}`
let prompt = `Current question is ${question}`

//Invoking graph.ts, passing history + latest question

const response = await graph.invoke({
    message: prompt,


     })


//We record latest user question and latest gpt reply to the newEntry object
// const newEntry = {user : question, GPT : response.aiComment}


// //We push latest entry to the end of the history array
// history.push(newEntry)
//
// //Now we need to send to database
//
// await prisma.aIconversation.upsert({
//   where: { userId_siteId: { userId: user.id, siteId: siteId } }, // Compound key
//   update: { thread: history },
//   create: { userId: user.id, siteId: siteId, thread: [newEntry] }
// })
//





// console.log(`This is sent to frontend ${JSON.stringify(response.acceptedResults)}`)

//So here is an idea to clean a bit accepted results in hopes the AI will better pickup


    const fieldsToRemove = ["id", "invoiceId", "siteId", "accepted", "reason"];

        const invoiceResults = response.acceptedResults.map(obj => {
        // Create a shallow copy of the object
        let cleaned = { ...obj };
        // Remove specified fields
        fieldsToRemove.forEach(field => delete cleaned[field]);
        return cleaned;
        });


return {


    acceptedResults : invoiceResults,
    aiComment: response.aiComment


}


}



