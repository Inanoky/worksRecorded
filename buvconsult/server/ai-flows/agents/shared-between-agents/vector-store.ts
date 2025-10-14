
import {OpenAIEmbeddings} from "@langchain/openai";
import {Pinecone, Pinecone as PineconeClient} from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";




export async function embedAndStoreDocs(

  client: PineconeClient,
  // @ts-ignore docs type error
  docs: Document<Record<string, any>>[],
  siteId : string,
  ids
  // siteId: string,
  // documentType : string
) {

  console.log("this")
  /*create and store the embeddings in the vectorStore*/
  try {
    const embeddings = new OpenAIEmbeddings({model: "text-embedding-3-large"});
    const index = client.Index("documents")

    //Creating vectore store with openAI embeddings

    const ps = new PineconeStore(embeddings,{
      pineconeIndex: index,
      namespace: siteId,
      textKey: 'text', //

    } )


    //embed the PDF documents. This is where we store to Pinecone info
    await ps.addDocuments(docs, {ids})





  } catch (error) {
    console.log('error ', error);
    throw new Error('Failed to load your docs !');
  }
}

