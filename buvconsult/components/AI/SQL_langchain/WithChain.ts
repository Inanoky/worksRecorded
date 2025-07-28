import { SqlDatabase } from "langchain/sql_db";
import { DataSource } from "typeorm";
import { SqlToolkit } from "langchain/agents/toolkits/sql";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Annotation } from "@langchain/langgraph";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {pull} from "langchain/hub";
import { z } from "zod";
import { QuerySqlTool } from "langchain/tools/sql";
import { StateGraph } from "@langchain/langgraph";



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

const db = await SqlDatabase.fromDataSourceParams({
  appDataSource: datasource,
});

const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
});

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  query: Annotation<string>,
  result: Annotation<string>,
  answer: Annotation<string>,
});

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0
});

const queryPromptTemplate = await pull<ChatPromptTemplate>(
  "langchain-ai/sql-query-system-prompt"
);

queryPromptTemplate.promptMessages.forEach((message) => {
  console.log(message.lc_kwargs.prompt.template);
});

const queryOutput = z.object({
  query: z.string().describe("Syntactically valid SQL query."),
});

const structuredLlm = llm.withStructuredOutput(queryOutput);

const writeQuery = async (state: typeof InputStateAnnotation.State) => {
  const promptValue = await queryPromptTemplate.invoke({
    dialect: db.appDataSourceOptions.type,
    top_k: 10,
    table_info: await db.getTableInfo(),
    input: state.question,
  });
  const result = await structuredLlm.invoke(promptValue);
  return { query: result.query };
};

await writeQuery({ question: "Check invoices from SIA A Komanda" });

const executeQuery = async (state: typeof StateAnnotation.State) => {
  const executeQueryTool = new QuerySqlTool(db);
  return { result: await executeQueryTool.invoke(state.query) };
};

await executeQuery({
  question: "",
  query: "SELECT * FROM \"InvoiceItems\" LIMIT 10;",
  result: "",
  answer: "",
});


const generateAnswer = async (state: typeof StateAnnotation.State) => {
  const promptValue =
    "Given the following user question, corresponding SQL query, " +
    "and SQL result, answer the user question.\n\n" +
    `Question: ${state.question}\n` +
    `SQL Query: ${state.query}\n` +
    `SQL Result: ${state.result}\n`;
  const response = await llm.invoke(promptValue);
  return { answer: response.content };
};

const graphBuilder = new StateGraph({
  stateSchema: StateAnnotation,
})
  .addNode("writeQuery", writeQuery)
  .addNode("executeQuery", executeQuery)
  .addNode("generateAnswer", generateAnswer)
  .addEdge("__start__", "writeQuery")
  .addEdge("writeQuery", "executeQuery")
  .addEdge("executeQuery", "generateAnswer")
  .addEdge("generateAnswer", "__end__");

const graph = graphBuilder.compile();

let inputs = { question: "Check invoices from SIA A Komanda" };

console.log(inputs);
console.log("\n====\n");
for await (const step of await graph.stream(inputs, {
  streamMode: "updates",
})) {
  console.log(step);
  console.log("\n====\n");
}