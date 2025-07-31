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




const databaseSchema_old = `
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

const databaseSchema_29_07_2025 = `
                                            model "InvoiceItems" {
                                              id String @id @default(uuid())                                              
                                              item String? - Description : contain original description of an invoice item
                                              quantity Float? - 
                                              "unitOfMeasure" //unitOfMeasure could be in "pcs", "m3", "tn","kg","unit","hour","minutes","day","month","project"
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


//For this prompt model started hallucinating table names for some reason.

const databaseSchema_29_07_2025_v2 = `
                                            model "InvoiceItems" {
                                              id String @id @default(uuid())                                              
                                              item String? - Description : contain original description of an invoice item
                                              quantity Float? - 
                                              "unitOfMeasure" //unitOfMeasure could be in "pcs", "m3", "tn","kg","unit","hour","minutes","day","month","project"
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
                                            }
                                            
                                            Example of data stored in first 3 rows for better understanding:
                                            
                                            [{"idx":0,"id":"003b1812-ae57-4358-8bf3-bb7f29bec3c4","item":"RECKLI MATRIX Nr. 2/90 TRAVERTIN, Type C (e.g., 3140mm x 1834mm)","currency":"EUR","category":"Construction materials.Concrete.Precast","commentsForUser":null,"invoiceId":"cmcumapi100259xagzkq10tb8","unitOfMeasure":"m3","siteId":"48f39d7c-9d7f-4c6e-bb12-b20a8d7e7315","isInvoice":null,"sum":1399.68,"pricePerUnitOfMeasure":243,"quantity":5.76,"itemDescription":"RECKLI MATRIX, Nr. 2/90 TRAVERTIN, Type C. Mold system sized at 3140mm x 1834mm for smaller detailed wall cladding, pattern imprints on architectural concrete. Polyurethane, reusable up to 100 times. Price: 243 EUR/m².","invoiceDate":"2023-12-14","invoiceNumber":"RE-4R23-70","paymentDate":"2023-12-15","sellerName":"REfero SIA"},{"idx":1,"id":"00480ff4-db36-4980-93db-c6fe4e7665db","item":"Rami Risks 5% - INS325","currency":"EUR","category":"Overheads.Other","commentsForUser":null,"invoiceId":"cmcuhxxy7001h9xf0vahwltmk","unitOfMeasure":"day","siteId":"0434c876-c31b-450c-8f92-cdcd37912565","isInvoice":null,"sum":0.73,"pricePerUnitOfMeasure":0.1,"quantity":1,"itemDescription":"Rami Risks 5% - INS325 – Small insurance/service fee for equipment rental, likely covers liability or damage. 1 unit, 7 days at 0.10 EUR/day. Total 0.73 EUR.","invoiceDate":"2024-11-30","invoiceNumber":"IV0084169","paymentDate":"2024-12-15","sellerName":"Ramirent Baltic AS Rīgas filiāle"},{"idx":2,"id":"00589506-1e64-462c-9413-a089404b1e44","item":"Reinforced polypropylene bags 55x100cm (57x95cm)","currency":"EUR","category":"Construction materials.Plastics","commentsForUser":null,"invoiceId":"cmcunasqb00ix9xagpnl8tct7","unitOfMeasure":"pcs","siteId":"48f39d7c-9d7f-4c6e-bb12-b20a8d7e7315","isInvoice":null,"sum":4.65,"pricePerUnitOfMeasure":0.31,"quantity":15,"itemDescription":"Strong woven polypropylene bags, reinforced for increased load capacity, dimensions 55x100cm (alternative size 57x95cm). Often used for carrying or storing building materials, debris, or waste. Cost per unit 0.31 EUR (after 25% discount), total cost 4.65 EUR for 15 bags.","invoiceDate":"2024-08-27","invoiceNumber":"OLM492214","paymentDate":"2024-09-26","sellerName":"Optimera Latvia, SIA"}]
                                            
                                            
                                            
                                            
                                            
                                            `;



const databaseSchema_29_07_2025_v3 = `

                                            This is postgreSQL database. DDL schema.  : 

                                            create table public."InvoiceItems" (
                                              id text not null,
                                              item text null,
                                              currency text null,
                                              category text null,
                                              "commentsForUser" text null,
                                              "invoiceId" text not null,
                                              "unitOfMeasure" text null,
                                              "siteId" text null,                                              
                                              sum double precision null,
                                              "pricePerUnitOfMeasure" double precision null,
                                              quantity double precision null,
                                              "itemDescription" text null,
                                              "invoiceDate" text null,
                                              "invoiceNumber" text null,
                                              "paymentDate" text null,
                                              "sellerName" text null,
                                              constraint InvoiceItems_pkey primary key (id),
                                              constraint InvoiceItems_invoiceId_fkey foreign KEY ("invoiceId") references "Invoices" (id) on update CASCADE on delete CASCADE,
                                              constraint InvoiceItems_siteId_fkey foreign KEY ("siteId") references "Site" (id) on update CASCADE on delete CASCADE
                                            ) TABLESPACE pg_default;

                                            
                                            Example of data stored in first 3 rows for better understanding:
                                            
                                            [{"idx":0,"id":"003b1812-ae57-4358-8bf3-bb7f29bec3c4","item":"RECKLI MATRIX Nr. 2/90 TRAVERTIN, Type C (e.g., 3140mm x 1834mm)","currency":"EUR","category":"Construction materials.Concrete.Precast","commentsForUser":null,"invoiceId":"cmcumapi100259xagzkq10tb8","unitOfMeasure":"m3","siteId":"48f39d7c-9d7f-4c6e-bb12-b20a8d7e7315","sum":1399.68,"pricePerUnitOfMeasure":243,"quantity":5.76,"itemDescription":"RECKLI MATRIX, Nr. 2/90 TRAVERTIN, Type C. Mold system sized at 3140mm x 1834mm for smaller detailed wall cladding, pattern imprints on architectural concrete. Polyurethane, reusable up to 100 times. Price: 243 EUR/m².","invoiceDate":"2023-12-14","invoiceNumber":"RE-4R23-70","paymentDate":"2023-12-15","sellerName":"REfero SIA"},{"idx":1,"id":"00480ff4-db36-4980-93db-c6fe4e7665db","item":"Rami Risks 5% - INS325","currency":"EUR","category":"Overheads.Other","commentsForUser":null,"invoiceId":"cmcuhxxy7001h9xf0vahwltmk","unitOfMeasure":"day","siteId":"0434c876-c31b-450c-8f92-cdcd37912565","sum":0.73,"pricePerUnitOfMeasure":0.1,"quantity":1,"itemDescription":"Rami Risks 5% - INS325 – Small insurance/service fee for equipment rental, likely covers liability or damage. 1 unit, 7 days at 0.10 EUR/day. Total 0.73 EUR.","invoiceDate":"2024-11-30","invoiceNumber":"IV0084169","paymentDate":"2024-12-15","sellerName":"Ramirent Baltic AS Rīgas filiāle"},{"idx":2,"id":"00589506-1e64-462c-9413-a089404b1e44","item":"Reinforced polypropylene bags 55x100cm (57x95cm)","currency":"EUR","category":"Construction materials.Plastics","commentsForUser":null,"invoiceId":"cmcunasqb00ix9xagpnl8tct7","unitOfMeasure":"pcs","siteId":"48f39d7c-9d7f-4c6e-bb12-b20a8d7e7315","sum":4.65,"pricePerUnitOfMeasure":0.31,"quantity":15,"itemDescription":"Strong woven polypropylene bags, reinforced for increased load capacity, dimensions 55x100cm (alternative size 57x95cm). Often used for carrying or storing building materials, debris, or waste. Cost per unit 0.31 EUR (after 25% discount), total cost 4.65 EUR for 15 bags.","invoiceDate":"2024-08-27","invoiceNumber":"OLM492214","paymentDate":"2024-09-26","sellerName":"Optimera Latvia, SIA"}]
                                            
                                            
                                            
                                            
                                            
                                            `;
















export const databaseSchema = databaseSchema_29_07_2025_v3


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


const SQLConstructSystemPrompt_29_07_2025 = `
            RETURN SINGLE SQL QUERY OTHERWISE IT WILL BRAKE THE FLOW. 
            
            You are intelligent construction project management, estimation specialsist
            and also you are postgreSQL database specialist
            
            
            
            You are given :            
            1) User question
            2) Database schema
            3) List of available categories
            
            Create a valid SQL request to retrieve as much as possible information from database.
            
            Ignore any summarization/grouping request, just retreive information, 
            Search should return list of items/itemDescription
            List should always include id of invoice item
             
                     
            
            
            Table names and field names in a query always enclose in double quotes. 
            For WHERE statements always use ILIKE %% `


const SQLConstructSystemPrompt_30_07_2025 = `
            RETURN SINGLE SQL QUERY OTHERWISE IT WILL BRAKE THE FLOW. 
            
            You are intelligent construction project management, estimation specialsist
            and also you are postgreSQL database specialist
            
            
            
            You are given :            
            1) User question
            2) Database schema
            3) List of available categories
            
            Create a valid SQL request to retrieve as much as possible information from database.
            SQL should retrieve all table fields. 
            Ignore any summarization/grouping request, just retreive information, 
            Search should return list of items/itemDescription
            List should always include id of invoice item
             
                     
            
            
            Table names and field names in a query always enclose in double quotes. 
            For WHERE statements always use ILIKE %% `


export const SQLConstructSystemPrompt = SQLConstructSystemPrompt_30_07_2025

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

const newSQLDescriptionPrompt5_29_07_2025 = "SQL command"

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
                "id, sellerName, item, qunatity, unit, sum fields should always be returned " +
                "For WHERE statements always use ILIKE %%" +
                "If SQL consist of 2 queries, combine into one" +
                "Return a valid SQL single query"

const newSQLDescriptionPrompt5_29_07_2025_v1 = "You are given SQL query and your job is to format it :" +

                "Always filter by siteId (provided in the user's prompts)" +
                "All columns and fields names should be in double quotes" +
                "All fields should always be returned " +
                "For WHERE statements always use ILIKE %%" +
                "If SQL consist of 2 queries, combine into one" +
                "Return a valid SQL single query"

const newSQLDescriptionPrompt5_29_07_2025_v2 = "You are given SQL query and your job is to format it :" +
                "Do this only : " +

                "Always filter by siteId (provided in the user's prompts)" +
                "All columns and fields names should be in double quotes" +
                "All fields should always be returned " +
                "For WHERE statements always use ILIKE %%" +
                "If SQL consist of 2 queries, combine into one" +
                "Return a valid SQL single query" +
                "\n" +
                "Do not modify search keywords !"

const newSQLDescriptionPrompt5_29_07_2025_v3 = "You are given SQL query and your job is to format it :" +
                "Do this only : " +

                "Always filter by siteId (provided in the user's prompts)" +
                "All columns and fields names should be in double quotes" +
                "All fields should always be returned " +
                "For WHERE statements always use ILIKE %%" +
                "If SQL consist of 2 queries, combine into one" +
                "Return a valid SQL single query" +
                "\n" +
                "Do not modify search keywords !"

const newSQLDescriptionPrompt5_29_07_2025_v4 =

                "Add filter by siteId (provided in the user's prompts)"


export const newSQLDescriptionPrompt = newSQLDescriptionPrompt5_29_07_2025
export const SQLFormatSystemPrompt = newSQLDescriptionPrompt5_29_07_2025_v4


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

//------------------------SQL summary ------------------------------------------------

const sqlSummarySystemPrompt_29_07_2025_v1 = `You summarize SQL query and make a conclusion base on a SQL query result and user question`

const sqlSummarySystemPrompt_29_07_2025_v2 = `You summarize database query results and make a conclusion to answer user's question`

const sqlSummarySystemPrompt_29_07_2025_v3 = `You summarize database query results and make a conclusion to answer user's question.
                                                        Include field names in the summary`

const sqlSummarySystemPrompt_29_07_2025_v4 = `You summarize database query results and make a conclusion to answer user's question
                                                     Example : 
                                                      All invoice line items for the project where the supplier or company is 'Ramirent' have been retrieved. 
                                                      For each invoice, the following details are provided: invoice number, date, line item description, quantity, and amount.`


const sqlSummarySystemPrompt_29_07_2025_v5 = `You summarize database query results and make a conclusion to answer user's question. List all the fields provided.  
                                                     Example : 
                                                     
                                                        All invoice line items for the project where the supplier or company is 'Schwenk' have been retrieved. 
                                                        For each invoice, the following details are provided: invoice number, date, line item description, quantity,
                                                        and amount. There are multiple invoices (e.g., 210116642, 210115783, 210112228, 210116626, 210115784, 210112513,
                                                        210120466, 210117357, 210118445, 210120976, 210123331, 210119703, 210121982, 210123578, 210122447, etc.), each 
                                                        containing several line items such as 'BETONS C30/37 8 mm S5', 'Betona piegāde objektā', 'Maksa par nepilnu mikseri', 
                                                        'Indeksētā degvielas piemaksa m3', and 'Transports objektā' with their respective quantities and amounts.`

export const sqlSummarySystemPrompt = sqlSummarySystemPrompt_29_07_2025_v5