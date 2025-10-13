"use server"

import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import {rerankDocs} from "@/server/ai-flows/agents/shared-between-agents/rerank";





const pc = new Pinecone();
const indexName = 'documents';


const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large" 
});



/**
 * Retrieve a ranked context for a user prompt.
 *
 * Workflow:
 * 1. Embed the `prompt` with OpenAI Embeddings.
 * 2. Query Pinecone (`topK=50`) within the given `siteId` namespace.
 * 3. Rerank the results with a secondary reranker for higher relevance.
 *
 * @param {string} prompt - The user query or instruction to search context for.
 * @param {string} siteId - Namespace (tenant/project) used to scope the vector search.
 * @returns {Promise<any>} Ranked context suitable for downstream use (e.g., RAG).
 * @throws Will throw if embedding creation or Pinecone query fails.
 */


export async function retriever(prompt,siteId){




              const vector = await embeddings.embedQuery(prompt);
            

              // 2. Query Pinecone using the embedding

              const index = pc.index(indexName).namespace(siteId);
              const results = await index.query({
                topK: 50,
                vector,
                includeMetadata: true,
              });

              //--------------------------------------------RERANK FUNCTIONALITY-----------------------------------


            const context = await rerankDocs(results, prompt,15)




return context

}