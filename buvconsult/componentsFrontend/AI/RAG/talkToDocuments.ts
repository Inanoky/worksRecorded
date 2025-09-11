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
export async function talkToDocuments(prompt,siteId){





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


            const context = await rerankDocs(results, prompt,20)

            console.log(`This are collected results : ${context}`)







            // Generating response :
            // This maybe I do not need

            // const context = results.matches
            //     .map(match => match.metadata?.text)

            const llm = new ChatOpenAI({
              model: "gpt-4.1",
              temperature: 0.1,
              // other params...
            });

            console.log(context)


            const aiMsg = await llm.invoke([

                    ["human", "Use the following pieces of context to answer the question at the end." +
                    "Analyze context and make a conclusion in simple terms\n" +
                    "If you don't know the answer, just say that you don't know, don't try to make up an answer.\n" +
                    "Provide reason for your answer" +

                    `Context : ${context}
                    Question : ${prompt}` +
                    ""]])









return aiMsg.content

}