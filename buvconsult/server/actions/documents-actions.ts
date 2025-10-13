
"use server";

import {prisma} from "@/lib/utils/db";
import {requireUser} from "@/lib/utils/requireUser";
import { chunk } from "lodash";
import gptDocumentsResponse from "@/server/ai-flows/agents/extractors/gpt-extractor-for-documents";
import {LoadEmbeddings} from "@/server/ai-flows/agents/shared-between-agents/loadEmbeddings";
import { Pinecone } from '@pinecone-database/pinecone'
import { isLikelyScannedPdf } from "../../lib/utils/actions-helpers/is-likely-scanned-pdf";




export const saveDocumentsToDB = async (_: unknown, formData: FormData) => {
  const user = await requireUser();
  const siteId = formData.get("siteId") as string;
  const urls = JSON.parse((formData.get("fileUrls") as string) ?? "[]") as string[];

  let total = urls.length;
  let accepted = 0;

  console.log(`Those are URLs ${urls}`);

  // Split URLs into batches of 15
  const urlBatches = chunk(urls, 15);

  for (const batch of urlBatches) {
    // 0️⃣ Filter out scanned PDFs first (quietly skip), in parallel
    const checks = await Promise.all(
      batch.map(async (url) => {
        const scanned = await isLikelyScannedPdf(url);
        if (scanned) {
          console.log(`🟡 Skipping scanned (image-only) PDF: ${url}`);
          return null;
        }
        return url;
      })
    );

    const cleanUrls = checks.filter((u): u is string => Boolean(u));
     accepted += cleanUrls.length;
    if (cleanUrls.length === 0) {
      console.log("ℹ️ No text-based PDFs in this batch, moving on.");
      continue;
    }

    // 1️⃣ GPT extraction for each remaining URL in parallel
    const gptResults = await Promise.all(
      cleanUrls.map(async (url) => {
        try {
          const gptRaw = await gptDocumentsResponse(url);
          const gptResp = typeof gptRaw === "string" ? JSON.parse(gptRaw) : gptRaw;
          console.log(`This is a GPT response ${JSON.stringify(gptResp)}`);
          return { url, gptResp };
        } catch (err) {
          console.log(`🔶 GPT failed for ${url}, skipping.`, err);
          return null; // quietly skip if GPT fails
        }
      })
    );

    const validGpt = gptResults.filter((r): r is { url: string; gptResp: any } => Boolean(r));
    if (validGpt.length === 0) {
      console.log("ℹ️ No valid GPT results in this batch, moving on.");
      continue;
    }

    // 2️⃣ Save documents to DB in parallel
    await Promise.all(
      validGpt.map(async ({ url, gptResp }) => {
        try {
          await prisma.documents.create({
            data: {
              ...gptResp, // or pick specific fields
              url,
              userId: user.id,
              siteId,
            },
          });
        } catch (err) {
          console.log(`🔶 DB save failed for ${url}, skipping.`, err);
        }
      })
    );

    // 3️⃣ Generate embeddings in parallel (only for successfully processed URLs)
    await Promise.all(
      validGpt.map(async ({ url }) => {
        try {
          await LoadEmbeddings(url, siteId);
        } catch (err) {
          console.log(`🔶 Embeddings failed for ${url}, skipping.`, err);
        }
      })
    );
  }

  return { accepted,total};
};

export async function getDocumentsFromDB(siteId: string){

    const user = await requireUser();

    const documents = await prisma.documents.findMany({

        where: {
            userId: user.id,
            siteId: siteId,
        }
    })
    return documents

}

export async function deleteDocuments(documentId: string, siteId: string) {



  console.log(`DoucumentId passed : ${documentId}`)
    console.log(`siteId passed : ${siteId}`)



  const pc = new Pinecone()




  const index = pc.index("documents")
  const ns = index.namespace(siteId)

    const fetchResult = await index.namespace(siteId).fetch([documentId])
    const chunkCount = fetchResult.records[documentId].metadata.chunkCount
    console.log(fetchResult.records[documentId].metadata.chunkCount)
    const deletedId = []

    deletedId.push(`${documentId}`)

    for (let i = 1; i <= chunkCount; i++ ){
        deletedId.push(`${documentId}-${i}`)
    }

    await ns.deleteMany(deletedId)


 await prisma.documents.delete({ where: { id: documentId } });
  return { ok: true };
}

export async function updateDocuments(id: string, data: any) {
  await prisma.documents.update({
    where: { id },
    data,
  });
  return { ok: true };
}
