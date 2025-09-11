"use server"

// aiDBsearcher.ts
import { Annotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { prisma } from "@/app/utils/db";
import { constructionCategories } from "@/componentsFrontend/AI/SQL/ConstructionCategories";
import {
    allowedFieldKeys, allowedFieldKeysPrompt,
    databaseSchema,
    newSQLDescriptionPrompt, qualityControlAiWasteAgent,
    qualityControlPrompt, qualityControlSQLAgent,
    qualityControlSystemPrompt,
    queryAnalysisSystemPrompt,
    returnBestFitFieldsPrompt,
    returnBestFitFieldsSystemPrompt,
    SQLConstructSystemPrompt,
    SQLFormatSystemPrompt, sqlSummarySystemPrompt, stateDefault
} from "@/componentsFrontend/AI/SQL/Prompts";
import { requireUser } from "@/app/utils/requireUser";
import aiWasteAgent from "@/componentsFrontend/AI/SQL/aiWasteAgent";

export default async function aiDBsearch(stateReceived) {
    // INIT
    // console.log("aiDBsearch START: Received state:", stateReceived);

    const state = stateDefault
    const allowedFieldKeys = allowedFieldKeysPrompt
    const schema = databaseSchema

    // --- SQL FORMAT ---
    const SQLformat = async (state) => {
        // console.log("SQLformat input state:", state);

        const user = await requireUser();

        const llm = new ChatOpenAI({
            temperature: 0.1,
            model: "gpt-4.1",
        });

        const structuredLlm = llm.withStructuredOutput(
            z.object({
                newSQL: z.string().describe(newSQLDescriptionPrompt),
                reason: z.string().describe("based on what you made your decisions")
            })
        )

        const prompt = `SQL command : ${state.sql},
            
        siteId" = '${state.siteId},
       
        `
        // console.log("SQLformat prompt:", prompt);

        const res = await structuredLlm.invoke([
            ["system", `${SQLFormatSystemPrompt}`],
            ["human", prompt]
        ]);

        // console.log("SQLformat OUTPUT:", res);

        return {
            ...state,
            sql: res.newSQL,
        };
    }

    // --- SQL EXECUTE ---
    const SQLexecute = async (state) => {
        // console.log("SQLexecute input state:", state);

        const sql = state.sql
        if (!sql) {
            // console.log("SQLexecute: No SQL generated!");
            return { ...state, fullResult: "No SQL generated." };
        }
        try {
            // console.log("SQLexecute: Executing SQL:", sql);
            const result = await prisma.$queryRawUnsafe(sql);
            // console.log("SQLexecute RESULT:", result);
            return {
                ...state,
                fullResult: result,
            };
        } catch (e) {
            // console.log("SQLexecute ERROR:", e.message);
            return {
                ...state,
                fullResult: `SQL Error: ${e.message}`,
            };
        }
    };


    const SQLexecutAnalysis = async (state) => {

        // So this is pretty much a filter to iterate over SQL to have a better result.
        // We will accept state.sql, state.result and state.message (user question)

    }

    // --- QUALITY CONTROL ---
    const qualityControl = async (state) => {
    // console.log("qualityControl input state:", state);

    const batchSize = 50;

    const llm = new ChatOpenAI({
        temperature: 0.7,
        model: "gpt-4.1",
    });

    // Decide which prompt to use based on state.choose_agent_to_call
    let systemPrompt;
    if (state.choose_agent_to_call === 'call_waste_analysis_agent') {
        systemPrompt = qualityControlAiWasteAgent;
    } else {
        systemPrompt = qualityControlSQLAgent; // <- your SQL agent system prompt
    }

    const structuredLlm = llm.withStructuredOutput(
        z.object({
            results: z.array(
                z.object({
                    id: z.string(),
                    accepted: z.boolean(),
                    reason: z.string(),
                })
            ),
        })
    );

    const allData = state.fullResult || [];
    // console.log("qualityControl fullResult data:", allData);

    const batches = [];
    for (let i = 0; i < allData.length; i += batchSize) {
        batches.push(allData.slice(i, i + batchSize));
    }
    // console.log("qualityControl split into", batches.length, "batches");

    // const userQuestion =
    //     typeof state.message !== "undefined"
    //         ? state.message
    //         : state.message || state.userRequest || "";

    const prompts = batches.map(
        (batch) => `
        User question: ${state.question}
        Data batch: ${JSON.stringify(batch, null, 2)}
    `
    );

    // Call LLM for each batch in parallel
    const responses = await Promise.all(
        prompts.map((prompt, idx) =>
            structuredLlm
                .invoke([
                    ["system", systemPrompt], // <<<< THIS IS WHERE IT SWITCHES
                    ["human", prompt],
                ])
                .then((res) => ({
                    res,
                    batch: batches[idx],
                }))
        )
    );

    responses.forEach(({ res }, idx) => {
    // console.log(`LLM batch response for batch #${idx + 1}:`, JSON.stringify(res, null, 2));
        });


    // console.log("qualityControl LLM responses:", responses);

    // Collect ALL results from all batches
    let acceptedResults = [];
    responses.forEach(({ res, batch }) => {
        res.results.forEach((result) => {
            if (result.accepted) {
                const obj = batch.find((item) => item.id === result.id);
                if (obj) {
                    acceptedResults.push({
                        ...obj,
                        accepted: result.accepted,
                        reason: result.reason,
                    });
                }
            }
        });
    });

    acceptedResults.forEach((r, i) => {
        // console.log(`Accepted result #${i + 1}:`, r);
    });

    const filtered = acceptedResults.map(({ accepted, reason, ...rest }) => rest);

    return {
        ...state,
        acceptedResults: acceptedResults,
        fullResult: filtered,
    };
};

    // --- BEST FIELD FIT ---
    const returnBestFitFields = async (state) => {
        // console.log("returnBestFitFields input state:", state);

        const llm = new ChatOpenAI({
            temperature: 0.1,
            model: "gpt-4.1",
            system: returnBestFitFieldsSystemPrompt
        });

        const structuredLlm = llm.withStructuredOutput(
            z.object({
                userDisplayFields: z
                    .array(z.enum(allowedFieldKeys))
                    .max(6, "No more than 6 fields allowed")
                    .describe("chose 6 FieldKeys which would be best to use to display data to the user "),
                reason: z.string().describe("based on what you made your decisions")
            })
        )

        const prompt = `SQL command for checking : ${state.sql} 
                        prisma schema ${schema}
                        `
        // console.log("returnBestFitFields prompt:", prompt);

        const response = await structuredLlm.invoke(["human", prompt]);

        // console.log("returnBestFitFields OUTPUT:", response);

        state.userDisplayFields = response.userDisplayFields;

        // This supposed to remove keys which are not important for the user
        const result = state.fullResult.map(obj =>
            Object.fromEntries(
                Object.entries(obj).filter(([field]) =>
                    state.userDisplayFields.includes(field)
                )
            )
        );

        // console.log("returnBestFitFields: Filtered display fields result:", result);

        return {
            ...state,
            result: result,
            useDisplayFields: response.userDisplayFields,
        };
    }

    // --- SUMMARY ---
    const summary = async (state) => {
        // console.log("summary input state:", state);

        const llm = new ChatOpenAI({
            temperature: 0,
            top_p: 0,
            model: "gpt-4.1",

        });

        const structuredLlm = llm.withStructuredOutput(
            z.object({
                aIComment: z.string().describe("Summary"),
                reason: z.string().describe("based on what you made your decisions")
            })
        )

        const prompt = `
            original user question ${state.message}            
            prisma schema ${schema},
            SQL query results ${JSON.stringify(state.fullResult)},
            `

        // console.log("summary prompt:", prompt);

        const res = await structuredLlm.invoke([
            ["human", prompt],
            ["system", sqlSummarySystemPrompt]

        ]);

        // console.log("summary OUTPUT:", res);

        return {
            ...state,
            aiComment: res.aIComment
        };
    }

    // --- STATEGRAPH ---
    const workflow = new StateGraph(state)
        .addNode("sql-format", SQLformat)
        .addNode("sql-execute", SQLexecute)
        .addNode("qualityControl", qualityControl)
        .addNode("return-best-fit-fields", returnBestFitFields)
        .addNode("summary", summary)
        .addEdge("__start__", "sql-format")
        .addEdge("sql-format", "sql-execute")
        .addEdge("sql-execute", "qualityControl")
        .addEdge("qualityControl", "return-best-fit-fields")
        .addEdge("return-best-fit-fields", "summary")
        .addEdge("summary", "__end__")

    const graph = workflow.compile()

    // console.log("STARTING STATEGRAPH INVOKE --------------------")
    const graphResult = await graph.invoke({
        ...stateReceived
    })

    // console.log("FINAL aiDBsearch graphResult:", graphResult);
    return graphResult
}
