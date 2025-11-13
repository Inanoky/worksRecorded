"use server";

import OpenAI from "openai";
import { PdfImage, PdfResource, PngImageFormat } from "@dynamicpdf/api";
import { z } from "zod";
import { constructionCategories } from "./construction-categories";
import {zodTextFormat} from "openai/helpers/zod";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


/**
 * 
 * @param fileUrl - a URL to uploaded PDF from UploadThing 
 * 
 * @returns 
 */

export default async function gptResponse(fileUrl: string) {

  // 1) Fetch the PDF (public URL)

  const pdfResp = await fetch(fileUrl);
  if (!pdfResp.ok) throw new Error(`Failed to fetch PDF: ${pdfResp.status}`);
  const pdfBytes = Buffer.from(await pdfResp.arrayBuffer());

  // 2) Convert PDF → PNG (base64 per page) via DynamicPDF API

  const pdfImage = new PdfImage(new PdfResource(pdfBytes)); // bytes work too
  pdfImage.apiKey = process.env.DynamicPDF_API_KEY
  const png = new PngImageFormat();

 

  pdfImage.ImageFormat = png;

  const conv = await pdfImage.process();
  if (!conv.isSuccessful) {
    throw new Error(
      `DynamicPDF failed: ${conv["errorMessage"] || JSON.stringify(conv["errorJson"])}`
    );
  }



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
  invoiceItemDate: z.coerce.date().nullable().optional(),
  
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


  // 3) Build input_image items for OpenAI (data URLs)
  const imageItems = conv.images.map(img => ({
    type: "input_image" as const,
    image_url: `data:image/png;base64,${img.data}`, // turn base64 into a data URL
  }));

  // 4) Ask GPT-4.1 (vision) with multiple images
  const res = await client.responses.create({
    model: "gpt-5",
    input: [
      {
        role: "user",
        content: [
          ...imageItems,
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

  console.log("GPT raw response:", res.output_text);

  return res.output_text;
}