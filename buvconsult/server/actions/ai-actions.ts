"use server";
import { prisma } from "@/app/utils/db";
import OpenAI from "openai";
import {ChatOpenAI} from "@langchain/openai";
import {aiSQLsearch} from "@/lib/AI/tools";
import {createOpenAIFunctionsAgent} from "langchain/agents";
import {ChatPromptTemplate, MessagesPlaceholder} from "@langchain/core/prompts";
import {createReactAgent} from "@langchain/langgraph/prebuilt";
import {tool} from "@langchain/core/tools";
//nothing

// Initialize OpenAI
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


//Code to add embeddings. Manually button in Programm for now.
// export async function backfillInvoiceEmbeddings() {
//   // Get InvoiceItems without embedding (limit for batching)
//   const items = await prisma.$queryRawUnsafe(`
//     SELECT "InvoiceItems".id,
//            "InvoiceItems".item,
//            "InvoiceItems".category,
//            "InvoiceItems"."itemDescription",
//            "InvoiceItems"."commentsForUser",
//            "InvoiceItems"."unitOfMeasure",
//            "InvoiceItems"."pricePerUnitOfMeasure",
//            "InvoiceItems"."quantity",
//            "InvoiceItems"."currency",
//            "InvoiceItems"."sum",
//            "Invoices"."sellerName",
//            "Invoices"."invoiceNumber",
//            "Invoices"."buyerName",
//            "Invoices"."invoiceDate",
//            "Invoices"."paymentDate"
//     FROM "InvoiceItems"
//     JOIN "Invoices" ON "InvoiceItems"."invoiceId" = "Invoices".id
//     WHERE "InvoiceItems".embedding IS NULL
//     LIMIT 3000
//   `);
//
//   if (!items.length) {
//     return { status: "no items to embed" };
//   }
//
//   // Process items one by one (for simplicity—can parallelize later)
//    for (const row of items) {
//     const inputText = [
//             row.item ? `Item: ${row.item}` : "",
//             row.category ? `Category: ${row.category}` : "",
//             row.itemDescription ? `AI Comment: ${row.itemDescription}` : "",
//             row.commentsForUser ? `User Comment: ${row.commentsForUser}` : "",
//             row.unitOfMeasure ? `Unit of Measure: ${row.unitOfMeasure }` : "",
//             row.pricePerUnitOfMeasure ? `Price per unit of measure: ${row.pricePerUnitOfMeasure}` : "",
//             row.quantity  ? `Quantity: ${row.quantity}` : "",
//             row.currency ? `Currency: ${row.currency}` : "",
//             row.sum ? `Sum: ${row.sum}` : "",
//             row.sellerName ? `Seller: ${row.sellerName}` : "",
//             row.invoiceNumber ? `Invoice Number: ${row.invoiceNumber}` : "",
//             row.buyerName ? `Buyer: ${row.buyerName}` : "",
//             row.invoiceDate ? `Invoice Date: ${row.invoiceDate}` : "",
//             row.paymentDate ? `Payment Date: ${row.paymentDate}` : "",
//     ].filter(Boolean).join('\n');
//
//     // Create embedding
//     const response = await openai.embeddings.create({
//       model: "text-embedding-3-small",
//       input: inputText,
//     });
//     const embedding = response.data[0].embedding; // number[]
//
//     // Save embedding (pass as array, NOT string)
//     await prisma.$executeRawUnsafe(
//       `UPDATE "InvoiceItems" SET embedding = $1 WHERE id = $2`,
//       embedding,
//       row.id
//     );
//   }
//
//   return { status: "done", count: items.length };
// }




// export async function aiChatAction(messages) {
//     console.log("Action called")
//
//
//   const llm = new ChatOpenAI({
//     model: "gpt-4o", // Or "gpt-3.5-turbo"
//     temperature: 0.2,
//   })
//
//
//     const getWeather = tool((input) => {
//   if (["sf", "san francisco"].includes(input.location.toLowerCase())) {
//     return "It's 60 degrees and foggy.";
//   } else {
//     return "It's 90 degrees and sunny.";
//   }
// }, {
//   name: "get_weather",
//   description: "Call to get the current weather.",
//   schema: z.object({
//     location: z.string().describe("Location to get the weather for."),
//   })
// })
//
//     const agent = createReactAgent({
//
//         llm: llm,
//         tools: [aiSQLsearch]
//     })
//
//   const result = await agent.invoke(
//       {messages}
//   )
//
//
//   return { result: result.content };
// }

