"use server"

import yaml from "js-yaml";
import {CohereClient} from "cohere-ai";

const cohere = new CohereClient({token: process.env.COHERE_API_KEY})
export async function rerankDocs(results, prompt, topN){



    const yamlDocs = results.matches.map(doc => yaml.dump(doc, { sortKeys: false }));

                // console.log(`This nis from inside of rerankDocs ${JSON.stringify(yamlDocs)}`)


                // This is how we use rerank, we pass array of strings separated by coma (yamlDocs)

                const rerank = await cohere.v2.rerank({
                    documents: yamlDocs,
                    query: prompt,
                    topN: topN,
                    model: 'rerank-v3.5'
                })

      const rerankResults = rerank.results

      // console.log(`This nis from inside of rerankDocs, rerank results ${JSON.stringify(rerank)}`)

      const rerankedForLLM = rerankResults.map((r, i) =>
                  `---\nSource #${i + 1} (score: ${r.relevanceScore}):\n${yamlDocs[r.index]}`
                );

        

      return rerankedForLLM
}