import { SqlDatabase } from "langchain/sql_db";
import { DataSource } from "typeorm";
import { SqlToolkit } from "langchain/agents/toolkits/sql";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// Define the full connection manually based on your DATABASE_URL
const datasource = new DataSource({
  type: "postgres",
  host: "aws-0-eu-north-1.pooler.supabase.com",
  port: 6543,
  username: "postgres.wfsvrqtzsaqngbrbatfp",
  password: "Sapkullen2512!!",
  database: "postgres",
  extra: {
    connectionLimit: 5,
    pgbouncer: true,
  },

});

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0
});

const db = await SqlDatabase.fromDataSourceParams({
  appDataSource: datasource,
});

const toolkit = new SqlToolkit(db, llm);

const tools = toolkit.getTools();

console.log(
  tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
  }))
);

const exampleQuery = "Check ivoices from SIA A Komanda";

const agentExecutor = createReactAgent({ llm, tools });

const events = await agentExecutor.stream(
  { messages: [["user", exampleQuery]] },
  { streamMode: "values" }
);

for await (const event of events) {
  const lastMsg = event.messages[event.messages.length - 1];
  if (lastMsg.tool_calls?.length) {
    console.dir(lastMsg.tool_calls, { depth: null });
  } else if (lastMsg.content) {
    console.log(lastMsg.content);
  }
}