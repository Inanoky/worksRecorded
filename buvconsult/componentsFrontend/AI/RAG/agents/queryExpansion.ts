import {ChatOpenAI} from "@langchain/openai";
import {z} from "zod";
import {expandedQueriesDescribePrompt, queryExpansionSystemPrompt} from "@/components/AI/RAG/agents/prompts";



const queryExpansion = async (state) => {

    const llm = new ChatOpenAI({
        temperature: 0.5,
        model: "gpt-4.1",


    });

    const structuredLlm = llm.withStructuredOutput(
        z.object({


            expandedQueries: z.array(z.string()).length(5).describe(expandedQueriesDescribePrompt),
            reason: z.string().describe("Give your reason for your decision"),


        })
    );

    const response = await structuredLlm.invoke([
        ["human", `${state.message}`],
        ["system", queryExpansionSystemPrompt ]]);


    console.log("generalQuestion  ", response)
    return {
        ...state,
        expandedQueries: response.expandedQueries,
        queryExpansionReason: response.reason
    };
};