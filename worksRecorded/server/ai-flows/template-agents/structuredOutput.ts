import {ChatOpenAI} from "@langchain/openai";
import {z} from "zod";


const systemPrompt = "You are an assistant"

const structuredOutput = async (question) => {




    const llm = new ChatOpenAI({
        temperature: 0.1,
        model: "gpt-4.1",


    });

    const structuredLlm = llm.withStructuredOutput(
        z.object({
            answer: z.string().describe("Give your answer"),

        })
    );

    const response = await structuredLlm.invoke([
        ["human", `${question}`],
        ["system", systemPrompt ]]);





    return response.answer


};

const answerToPrint = await structuredOutput("What is 2+2?")
console.log(answerToPrint)

