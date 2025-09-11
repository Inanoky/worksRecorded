"use server"

import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { CohereClient} from 'cohere-ai';
import yaml from 'js-yaml'
import {rerankDocs} from "@/componentsFrontend/AI/RAG/rerank";

const cohere = new CohereClient({token: process.env.COHERE_API_KEY})
const pc = new Pinecone();
const indexName = 'documents';

// Create embeddings instance (optionally specify model)
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large" // Uncomment to use v3 small
  // model: "text-embedding-ada-002" // Or use ada-002
  // apiKey: process.env.OPENAI_API_KEY, // Optional, will use env by default
});


export async function retriever(prompt,siteId){





              const vector = await embeddings.embedQuery(prompt);
              const rerankingModel = 'bge-reranker-v2-m3';

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