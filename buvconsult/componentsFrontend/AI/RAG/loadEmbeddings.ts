import { getChunkedDocsFromPDF } from "@/componentsFrontend/AI/RAG/pdf-loader";
import { embedAndStoreDocs } from "@/componentsFrontend/AI/RAG/vector-store";
import { Pinecone } from "@pinecone-database/pinecone";
import { prisma } from "@/app/utils/db";

// Helper to flatten nested metadata (one level deep)

function flatten(obj, prefix = '', res = {}) {
  for (let key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flatten(value, newKey, res);
    } else {
      res[newKey] = value;
    }
  }
  return res;
}


export async function LoadEmbeddings(url, siteId) {
  try {
    const pc = new Pinecone();
    console.log("Preparing chunks from PDF file");

    // Get the document record from DB by URL
    const document = await prisma.documents.findFirst({ where: { url } });
    if (!document) {
      throw new Error(`Document not found in DB for URL: ${url}`);
    }
    const documentId = document.id;


    // Chunk the PDF
    const chunkedDocs = await getChunkedDocsFromPDF(url);
    const chunkCount = chunkedDocs.length;



    //So this code we are creating an array of and Ids, also adds chunkCount to metadata.

    const ids = [];
      for (let i = 0; i < chunkedDocs.length; i++) {
        ids.push(i === 0 ? `${documentId}` : `${documentId}-${i}`);
        chunkedDocs[i].metadata = {
          ...chunkedDocs[i].metadata,
          chunkCount: chunkCount,
  };

       if (chunkedDocs[i].pageContent && document.documentName) {
        chunkedDocs[i].pageContent = `[Document name : ${document.documentName}] ${chunkedDocs[i].pageContent}`;
  }
}
   console.log(`This is how Chunk look ${JSON.stringify(chunkedDocs[0])}`)







    await embedAndStoreDocs(pc, chunkedDocs, siteId,ids);

    console.log("✅ Data embedded and stored in Pinecone index");
  } catch (error) {
    console.error("❌ Init client script failed:", error);
  }
}
