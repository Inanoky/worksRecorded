"use server"
import 'dotenv/config'
import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone();

const indexName = 'documents';

await pc.createIndex({
  name: indexName,
  vectorType: 'dense',
  dimension: 3072, // <-- This must match the model's output size
  metric: 'cosine',
  spec: {
    serverless: {
      cloud: 'aws',
      region: 'us-east-1'
    }
  },
  deletionProtection: 'disabled',
  tags: { environment: 'development' },
});

console.log("Index created and ready:", indexName);
