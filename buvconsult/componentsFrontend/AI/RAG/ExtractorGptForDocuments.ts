"use server"


import OpenAI from "openai";
import {z} from "zod";
import {zodTextFormat} from "openai/helpers/zod";
import {constructionCategories} from "@/componentsFrontend/AI/SQL/ConstructionCategories";
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});





export default async function gptDocumentsResponse(fileUrl) {
  const response = await fetch(fileUrl);
  const blob = await response.blob();
  const file = new File([blob], "invoice.pdf", { type: "application/pdf" });

  const uploadedFile = await client.files.create({
    file,
    purpose: "user_data",
  });

  // ... keep your zod schema code as before ...



  const documentSchema = z.object({

  description : z.string(),
  documentName: z.string(),
  documentType: z.enum(["Contract", "Bill Of Quantity", "Other","Technical Specification",]),

  // Add more fields if you wish
});







  // const gptDocumentSchema = z.object({
  //   items: z.array(documentSchema),
  // });


  //gpt response for invoice items
  const gptDocumentResponse = await client.responses.create({
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
             text: "Extract general construction document metadata" +
                 "Translate to english "

          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(documentSchema, "event"),
    },
  });


  return gptDocumentResponse.output_text;
}
