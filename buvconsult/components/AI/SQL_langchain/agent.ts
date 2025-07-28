import { SqlToolkit } from "langchain/agents/toolkits/sql";
import {DataSource} from "typeorm";
import { SqlDatabase } from "langchain/sql_db";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import {ChatOpenAI} from "@langchain/openai";
import { AIMessage, BaseMessage, isAIMessage } from "@langchain/core/messages";


const prettyPrint = (message: BaseMessage) => {
  let txt = `[${message._getType()}]: ${message.content}`;
  if ((isAIMessage(message) && message.tool_calls?.length) || 0 > 0) {
    const tool_calls = (message as AIMessage)?.tool_calls
      ?.map((tc) => `- ${tc.name}(${JSON.stringify(tc.args)})`)
      .join("\n");
    txt += ` \nTools: \n${tool_calls}`;
  }
  console.log(txt);
};

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0
});


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

const toolkit = new SqlToolkit(db, llm);

const tools = toolkit.getTools();

console.log(
  tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
  }))
);

// const systemPromptTemplate = await pull<ChatPromptTemplate>(
//   "langchain-ai/sql-agent-system-prompt"
// );

const systemPromptTemplate = ChatPromptTemplate.fromTemplate(


    `You are a helpful AI assistant that interacts with a SQL database.
Your job is to answer user questions by querying the database intelligently.
Only use the provided tools to run SQL.
Asses critically request, keywords request should be flexible and include possible typos user can make in a query. 
Always use double qoutes for table names.
Dialect: {dialect}
Limit yourself to the top {top_k} results unless otherwise requested.`,

)






const systemMessage = await systemPromptTemplate.format({
  dialect: db.appDataSourceOptions.type,
  top_k: 5,


});

const agent = createReactAgent({
  llm: llm,
  tools: tools,
  prompt: systemMessage,
});

let inputs2 = {
  messages: [
    { role: "user", content: "Check invoices from SIA A Komanda" },
  ],
};

for await (const step of await agent.stream(inputs2, {
  streamMode: "values",
})) {
  const lastMessage = step.messages[step.messages.length - 1];
  prettyPrint(lastMessage);
  console.log("-----\n");
}