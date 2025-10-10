import {Annotation} from "@langchain/langgraph";
import {ChatOpenAI} from "@langchain/openai";
import {z} from "zod";
import {call_db_agentSchemPrompt, generalQuestionPrompts} from "@/server/ai/sql/Prompts";


type QueryType = "Single document" | "multi document";

type Status = {
    status: QueryType | null;
    reason?: string;
};

//Here are agent list

type AgentToCall = "singleDocumentAgent" | "multiDocumentAgent" | "agent_not_needed";

type HelperToCall = "callMetadataHelper" | "callVectorHelper";




export const stateDefault = Annotation.Root({
    userQuery: Annotation<string[]>(),
    expandedQueries: Annotation<string[]>(), //this is array of strings, 5 queries to search Vector database.
    combinedChunks: Annotation<string[]>(), //this we will store all returned chunks
    rerankedChunks : Annotation<string[]>(), //As a name suggests, this array we store after reranking.
    choose_agent_to_call: Annotation<AgentToCall>(),
    choose_helper_to_call: Annotation<HelperToCall>(),
    message: Annotation<string>(),
    resultToDisplay : Annotation<string>(),
    queryAnalysisReason: Annotation<string>(),
    queryExpansionReason: Annotation<string>(),
    rerankReason: Annotation<string>(),
    siteId: Annotation<string>(),
    summary: Annotation<string>(),

});