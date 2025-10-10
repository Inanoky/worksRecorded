"use server"


import OpenAI from "openai";
import {z} from "zod";
import {zodTextFormat} from "openai/helpers/zod";

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


  const documentSchema = z.object({

  description : z.string(),
  documentName: z.string(),
  documentType: z.enum(["Contract", "Bill Of Quantity", "Other","Technical Specification",]),


});


 
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
