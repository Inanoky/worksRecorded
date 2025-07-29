// State



import {Annotation} from "@langchain/langgraph";


type StatusType = "SQL" | "VECTOR";

type Status = {
    status: StatusType | null;
    answer?: string;
    reason?: string;
};

//Here are agent list

type AgentToCall = "call_db_agent" | "call_waste_analysis_agent" | "agent_not_needed";



export const stateDefault = Annotation.Root({
    question: Annotation<string>(),
    message: Annotation<string>(),
    status: Annotation<Status>(),
    sql: Annotation<string | null>({ default: () => null }),
    fullResult: Annotation<any | null>({ default: () => null }),
    result: Annotation<any | null>({ default: () => null }),
    acceptedResults: Annotation<any | null>({ default: () => null }),
    aiComment: Annotation<any | null>(),
    userDisplayFields : Annotation<string[]>(),
    siteId: Annotation<string[]>(),
    choose_agent_to_call: Annotation<AgentToCall>(),
    pastMessages: Annotation<string[]>({
        default: () => [],
        reducer: (currValue, updateValue) => currValue.concat(updateValue),
    }),
});





















//aiGeneral.ts generalQuestion






export const databaseSchema = `
                                            model "InvoiceItems" {
                                              id String @id @default(uuid())                                              
                                              item String? - Description : contain original description of an invoice item
                                              quantity Float? - 
                                              "unitOfMeasure" String?
                                              "pricePerUnitOfMeasure" Float?
                                              sum Float?
                                              currency String? 
                                              category String? 
                                              "itemDescription" String? - Description : detailed description of what this invoice item is
                                              "commentsForUser" String?
                                              "isInvoice" Boolean?
                                              "invoiceId" String
                                              invoice Invoices @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
                                              "Site" Site? @relation(fields: [siteId], references: [id], onDelete: Cascade)
                                              "siteId" String?
                                              "invoiceNumber" String?
                                              "sellerName" String? 
                                              "invoiceDate" String? - Description : contains date of an invoice
                                              "paymentDate" String?
                                            }`;


export const allowedFieldKeysPrompt = [
  "date",
  "item",
  "quantity",
  "unitOfMeasure",
  "pricePerUnitOfMeasure",
  "sum",
  "currency",
  "category",
  "itemDescription",
  "commentsForUser",
  "isInvoice",
  "invoiceId",
  "invoiceNumber",
  "sellerName",
  "invoiceDate",
  "paymentDate"
];



//system prompts
//generalQuestion

const prompt1 =  "Your have access to the users construction cost databases. You need to pass `yes` in the " +
                        "continue field to access it." +
                        "Answer user's query, if necessary - access database"

const prompt2 =  "Your are data scientist and your job is to answer user's query. If you need access to the database," +
                        "You can call call_db_agent, which we handle SQL call for the query to retrieve necessary information "

const prompt3_10_07_2025 =  "Your are data scientist and your job is to answer user's query. If you need access to the database," +
                        "You can call call_db_agent, which we handle SQL call for the query to retrieve necessary information " +
                            "The agents next to you are SQL agents, so construct a good prompts for them and pass in `message` field "

const prompt3_11_07_2025 =  "Your are data scientist and your job is to answer user's query. If you need access to the database," +
                        "You can call call_db_agent, which we handle SQL call for the query to retrieve necessary information " +
                            "The agents next to you are SQL agents, so construct a good prompts for them and pass in `message` field " +
                        "Do not ask agent to retrieve totals, only ask to get invocie items." +
                        "Ask agent to retreive a valid single SQL query " +
                        "Don't ask to restrict invoice to the latest date"

const prompt3_14_07_2025 =  "Your are data scientist and your job is to answer user's query. If you need access to the database," +
                        "Call call_waste_analysis_agent if question is regarding cost waste, or avoidable cost" +
                        "Call call_db_agent, for general database enquery" +
                        "The agents next to you are SQL agents, so construct a good prompts for them and pass in `message` field " +
                        "Do not ask agent to retrieve totals, only ask to get invocie items." +
                        "Ask agent to retreive a valid single SQL query " +
                        "Don't ask to restrict invoice to the latest date"

const call_db_agentSchemPrompt1 = "If asked need to call database agent - return `yes`"

const call_db_agentSchemPrompt2 = "Choose appropriate agent to call, if not needed - pass `no` "

export const generalQuestionPrompts =  prompt3_14_07_2025
export const call_db_agentSchemPrompt = call_db_agentSchemPrompt2

//aiSQLseearcher.ts prompts

//qualityControl system prompts

const qualityControlSystemPrompt1 = "Return only an array of IDs for objects that are a good fit for the user's request."
const qualityControlSystemPrompt2 = "Return only an array of IDs for objects that fit or loosely fit for the user's request."

// -------------------This is prompt for filter from aiWasteAgen------------------------------------------------------

const qualityControlAiWasteAgent1 = "You are doing Quality control as part of an agentic workflow" +
    "If you are involved, it means User's question is about Avoidable cost in his data. " +
    "Check the data you and assess each item." +
    "If item is a reasonable fit - return true for `accepted` field, if not return false. for `accepted` field" +
    "Give an explanation for the user for your decision"

const qualityControlAiWasteAgent14_07_2025 = "You are doing Quality control as part of an agentic workflow" +
    "If you are involved, it means User's question is about Avoidable cost in his data. " +
    "Check the data you and assess each item." +
    "If item is a reasonable fit - return true for `accepted` field, if not return false. for `accepted` field" +
    "Give an explanation for the user for your decision" +
    "Typical cost waste in construction : " +
    "     1) repairs - could be avoided if care is taken \n" +
    "             2) delays - could be avoided with good management \n" +
    "             3) waiting times  - could be avoided with good management \n" +
    "             4) rental equipment  - not necesseraly waste, but needs to be checked if purchasing is more efficient   \n" +
    "             5) fines - obvious waste \n" +
    "             6) additional charge - need to be analyzed, could be avoided \n" +
    "             7) cancellation - usually wastefull charge\n" +
    "             8) DHL - epxress deliveries wasteful\n" +
    "             9) Standstill - always waste \n" +
    "             10) redo, remaking, fixing, cleaning - all can be avoided an wasteful`\n" +
    ""



const qualityControlSQLAgent1 = "You are doing Quality control as part of an agentic workflow" +
    "Check the data you and assess each item." +
    "If item is a reasonable fit - return true for `accepted` field, if not return false. for `accepted` field"

export const qualityControlSystemPrompt = qualityControlSystemPrompt2

export const qualityControlAiWasteAgent = qualityControlAiWasteAgent14_07_2025

export const qualityControlSQLAgent = qualityControlSQLAgent1




//batching prompt

const qualityControlPrompt1 = "Return only an array of IDs for objects that are a good fit for the user's request."
const qualityControlPrompt2 = "Your job is to filter out all objects which are absolutely no match for user's request"

export const qualityControlPrompt = qualityControlPrompt2

//queryAnalysis prompts

const queryAnalysisSystemPrompt1 = "You are an expert in PostgreSQL and vector databases. " +
            "You will receive : user query mean for construction data dataase, you need to decide if it is better to proceed with an SQL query for the database or with a vector query." +
            "return VECTOR if query is not specific. " +
            'Answer ONLY with JSON: {status: "SQL" | "VECTOR", reason: string}'
export const queryAnalysisSystemPrompt = queryAnalysisSystemPrompt1

//SQL construct

const SQLConstructSystemPrompt1 = `
            RETURN SINGLE SQL QUERY OTHERWISE IT WILL BRAKE THE FLOW. 
            a
                You are intelligent construction project management, estimation specialsist
            and also you are postgreSQL database specialist
            
            
            
            You are given :            
            1) User question
            2) Database schema
            3) List of available categories
            
            Create a valid SQL request to provide best match for the user question. 
            Search should return list of items/itemDescription
            List should always include id of invoice item
             
                     
            
            
            Table names and field names in a query always enclose in double quotes. 
            For WHERE statements always use ILIKE %% `

export const SQLConstructSystemPrompt = SQLConstructSystemPrompt1

// ------------------------SQLformat------------------------------------------

const SQLFormatSystemPrompt1 = `You edit SQL queries.  `

const newSQLDescriptionPrompt1 = "You are given SQL query, human request and PostgreSQL schema." +
                " Determine, which fields would be the most relevant to the user and modify SQL command accordingly" +
                "Return adjusted SQL." +
                "All columns and fields names should be in double quotes" +
                "If user query is somehow related dates/periods - switch to searching FROM`Invoices` table " +
                "id must always be included " +
                "For WHERE statements always use ILIKE %%" +
                "Query return should always include fields item, sum, invoiceNumber and sellerName, but include more" +
                "fields than that. "

const newSQLDescriptionPrompt2 = "You are given SQL query, human request and PostgreSQL schema." +
                " Determine, which fields would be the most relevant to the user and modify SQL command accordingly" +
                "Return adjusted SQL." +
                "Always filter by siteId (provided in the user's prompts)" +
                "All columns and fields names should be in double quotes" +
                "If user query is somehow related dates/periods - switch to searching FROM`Invoices` table " +
                "id must always be included " +
                "For WHERE statements always use ILIKE %%" +
                "Query return should always include fields item, sum, invoiceNumber and sellerName, but include more" +
                "fields than that. "

const newSQLDescriptionPrompt3 = "You are given SQL query, human request and PostgreSQL schema." +

                "Always filter by siteId (provided in the user's prompts)" +
                "All columns and fields names should be in double quotes" +
                "For WHERE statements always use ILIKE %%"


const newSQLDescriptionPrompt4 = "You are given SQL query and your job is to format it :" +

                "Always filter by siteId (provided in the user's prompts)" +
                "All columns and fields names should be in double quotes" +
                "For WHERE statements always use ILIKE %%" +
                "Return a valid SQL single query"

const newSQLDescriptionPrompt5_11_07_2025 = "You are given SQL query and your job is to format it :" +

                "Always filter by siteId (provided in the user's prompts)" +
                "All columns and fields names should be in double quotes" +
                "id and item fields should always be returned " +
                "For WHERE statements always use ILIKE %%" +
                "If SQL consist of 2 queries, combine into one" +
                "Return a valid SQL single query"

const newSQLDescriptionPrompt5_28_07_2025 = "You are given SQL query and your job is to format it :" +

                "Always filter by siteId (provided in the user's prompts)" +
                "All columns and fields names should be in double quotes" +
                "id, sellerName, item and sum fields should always be returned " +
                "For WHERE statements always use ILIKE %%" +
                "If SQL consist of 2 queries, combine into one" +
                "Return a valid SQL single query"

export const newSQLDescriptionPrompt = newSQLDescriptionPrompt4
export const SQLFormatSystemPrompt = newSQLDescriptionPrompt5_28_07_2025


//--------------------------------------returnBestFitFields------------------------------------------

const returnBestFitFieldsSystemPrompt1 =  `We need to present data to the client. You will check the SQL query, database schema and and user query. You will rate the fields according to their 
            relevance to the user query. You will have to choose 6 most relevant fields to display to user.`


export const returnBestFitFieldsSystemPrompt = returnBestFitFieldsSystemPrompt1

//-----------------------------------aiWasteAgent-------------------------------------------

const aiWasteAnalysisPrompt1 = `You are intelligent construction project management, estimation specialsist
            and also you are postgreSQL database specialist
            
            You are given :            
            1) User question
            2) Database schema
            3) List of available categories
            
            Create an SQL request to provide search the database for pontetially wastefull expenses such as (included
             but not limited to :
             
             1) repairs
             2) delays
             3) waiting times
             4) rental equipment
             5) fines
             6) additional charge`


const aiWasteAnalysisPrompt2 = `You search for avoidable cost in the database
            
            You are given :            
            1) User question
            2) Database schema
            3) List of available categories
            
            Create a valid, single SQL query to provide search the database for avoidable cost
            Search should return list of all items/itemDescription which include keywords :  
             
             1) repairs
             2) delays
             3) waiting times
             4) rental equipment
             5) fines
             6) additional charge
             7) cancellation - usually wastefull charge
             8) DHL - epxress deliveries wasteful
             9) Standstill
             10) redo, remaking, fixing, cleaning - all can be avoided an wasteful`




export const aiWasteAnalysisPrompt = aiWasteAnalysisPrompt2


