
import { z } from "zod";
import { prisma } from "@/app/utils/db";
// import OpenAI from "openai";
import {openai} from "@ai-sdk/openai"
import graphQuery from "@/componentsFrontend/AI/SQL/aiDBsearcher";
import { tool } from "@langchain/core/tools";

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// const KNOWN_COLUMNS = [
//   "sellerName", "buyerName", "category", "invoiceNumber", "invoiceDate", "paymentDate",
//   "sum", "item", "itemDescription", "commentsForUser"
// ];
//
// export const describeSchema = tool({
//   description: "Returns the list of all tables and their columns.",
//   parameters: z.object({}),
//   execute: async () => {
//     const schema = `
//       You are an assistant that can answer questions about the following database schema.
//       Table and column names are case-sensitive and must be used as shown. Always use double quotes for table/column names with capital letters.
//       - "User": id, email, firstName, lastName, profileImage, customerId, createdAt
//       - "Site": id, name, description, subdirectory, createdAt, updatedAt, imageUrl, userId, ...
//       - "Invoices": id, url, invoiceNumber, sellerName, invoiceTotalSumNoVat, invoiceTotalSumWithVat, buyerName, invoiceDate, paymentDate, isInvoice, isCreditDebitProformaOrAdvanced, uploadedAt, userId, SiteId
//       - "InvoiceItems": id, date, item, quantity, unitOfMeasure, pricePerUnitOfMeasure, sum, currency, category, itemDescription, commentsForUser, isInvoice, invoiceId, siteId
//     `;
//     return schema;
//   }
// });


// export const planner = tool({
//   description: 'Analyze user query, break into steps to achieve a desired output',
//   parameters: z.object({
//     userRequest: z.string()
//   }),
//   execute: async ({ userRequest }) => {
//     const reply = await generateText({
//       model: openai("gpt-4o"),
//       system: "Break down user input into logical steps to achieve it",
//       prompt: userRequest
//     });
//     return reply.text;
//   }
// });



// // SMART tool assessment: decide whether to use SQL (symbolic) or semantic search (embedding)
// export const requestAssessment = tool({
//   description: `
//     Decides the best tool to answer the user's question: SQL (symbolic, column filtering) or semantic search (embedding/fuzzy).
//     - If the query contains an explicit column name (like 'seller', 'buyer', 'invoice number', 'category', 'date', etc) or asks for 'all', 'total', 'group', 'sum', 'count', return { mode: "symbolic" }.
//     - For broad, fuzzy, or exploratory queries with no column references, return { mode: "semantic", threshold: "loose" | "average" | "strict" }.
//     Always output either { mode: "symbolic" } or { mode: "semantic", threshold }.
//   `,
//   parameters: z.object({ query: z.string() }),
//   execute: async ({ query }) => {
//     // Check for "all"/exhaustive or specific column references
//     const lowerQuery = query.toLowerCase();
//     const signals = [
//       "all", "every", "total", "sum", "group", "count"
//     ].some((kw) => lowerQuery.includes(kw));
//     const columns = KNOWN_COLUMNS.some((col) => lowerQuery.includes(col.toLowerCase()) || lowerQuery.includes(col.replace(/([A-Z])/g, '_$1').toLowerCase()));
//     if (signals || columns) {
//       return { mode: "symbolic" };
//     }
//     // Default: classify semantic strictness
//     let threshold: "loose" | "average" | "strict" = "average";
//     if (query.length > 60 || query.match(/\b(slab|plywood|reinforcement|detailed|exact)\b/i)) {
//       threshold = "strict";
//     } else if (query.length < 20 || query.match(/\b(any|all|overview|summary)\b/i)) {
//       threshold = "loose";
//     }
//     return { mode: "semantic", threshold };
//   },
// });



// export const aiSQLsearch = tool(
//     async ({question}: { question: string }) => {
//         console.log("aiSQLsearch is called")
//       const response = await graphQuery(question)
//
//       return response
//     },
//     {
//       name : "SQL_AI_search",
//       description: "Will intelligently search database",
//       schema: z.object({
//         question: z.string()
//       })
//     }
// )


export const aiSQLsearch = tool(
  async (input) => {
    console.log("aiSQLsearch called, input:", input);
    return "DUMMY TOOL OUTPUT";
  },
  {
    name: "SQL_AI_search",
    description: "Test tool, returns a dummy value.",
    schema: z.object({
        question : z.string(),
    })
  }
)


export const getCoolestCities = tool(() => {
  return 'Salaspils';
}, {
  name: 'get_coolest_cities',
  description: 'Get a list of coolest cities',
  schema: z.object({
    answer: z.string().optional().describe("Just say Salaspils"),
  })
})


