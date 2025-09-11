"use server"


import OpenAI from "openai";
import {z} from "zod";
import {zodTextFormat} from "openai/helpers/zod";
import {constructionCategories} from "@/componentsFrontend/AI/SQL/ConstructionCategories";
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});





export default async function gptResponse(fileUrl) {
  const response = await fetch(fileUrl);
  const blob = await response.blob();
  const file = new File([blob], "invoice.pdf", { type: "application/pdf" });

  const uploadedFile = await client.files.create({
    file,
    purpose: "user_data",
  });

  // ... keep your zod schema code as before ...



  const invoiceItemSchema = z.object({
  item: z.string(),
  quantity: z.number(),
  unitOfMeasure: z.enum(["pcs", "m3", "tn","kg",
    "unit","hour","minutes",
    "day","month","project"]),
  pricePerUnitOfMeasure: z.number(),
  sum: z.number(),
  currency: z.string(),
  category: z.string(),
  itemDescription: z.string(),
  // Add more fields if you wish
});

  const invoiceSchema = z.object({
  invoiceNumber: z.string(),
  sellerName: z.string(),
  buyerName: z.string(),
  invoiceTotalSumNoVat: z.number(),
  invoiceTotalSumWithVat: z.number(),
  invoiceDate: z.coerce.date().nullable().optional(),
  paymentDate: z.coerce.date().nullable().optional(),
  isInvoice: z.boolean(),
  isCreditDebitProformaOrAdvanced: z.string(),
  items: z.array(invoiceItemSchema),
});






  const gptInvoicesSchema = z.object({
    items: z.array(invoiceSchema),
  });


  //gpt response for invoice items
  const gptResponse = await client.responses.create({
    model: "gpt-4.1",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            file_id: uploadedFile.id,
          },
          {
             type: "input_text",
             text: "Extract general construction invoice metadata and information for each item in the invoice." +
                 "Translate to english " +
                 "unitsOfMeasure and itemDescription fields return in English " +
                 "seller name should be extracted without single or double qoutes" +
                 "for item field extract item description from the invoice" +
                 "" +
                 "for itemDescription include thorough description of an item, what item likely used for, " +
                 "it's cost, amounts, what is it made of" +
                 "" +
                 `for categories use ${JSON.stringify(constructionCategories)}, but keep hierarchy intact` +

                 "Use dot as decimal separator" +
                  " If not and invoice, fill isInvoice field with `not an invoice`." +
                  " If some information not present - keep the field blank, do not halucinate." +
                  " In itemDescription field leave a description of what this item most likely is" +
                  "in isInvoice field is invoice credit, debit or proforma" +
                 "do not use currency sign for currencies" +
                 "Determine if invoice is debit, credit, proforma, advanced or unknown and fill in isCreditDebitProformaOrAdvanced " +
                 "return dates in ISO 8601 format"
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(gptInvoicesSchema, "event"),
    },
  });


  return gptResponse.output_text;
}
