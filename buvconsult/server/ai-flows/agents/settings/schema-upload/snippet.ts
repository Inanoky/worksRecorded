import OpenAI from "openai";
import * as XLSX from "xlsx";
import { AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { systemPrompt } from "@/server/ai-flows/agents/settings/schema-upload/prompts";

const MAX_CHARS_PER_BLOCK = 120_000; // rough safety for token limits

function chunkText(s: string, size = MAX_CHARS_PER_BLOCK) {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

export default async function talkToAgent(URL: string, siteId?: string) {
  const state = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y),
      default: () => [],
    }),
  });

  const agent = async (_state: { messages: BaseMessage[] }) => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log("📥 Downloading Excel from:", URL);

    // 1) Download Excel into memory
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`Failed to download file. HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("✅ File downloaded, size:", buffer.length, "bytes");

    // 2) Parse Excel -> CSV (all sheets)
    const wb = XLSX.read(buffer, { type: "buffer" });
    console.log("📄 Sheets found:", wb.SheetNames);

    const csvPieces: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;
      const csv = XLSX.utils.sheet_to_csv(ws, { FS: ",", RS: "\n" }).trim();
      if (csv) {
        console.log(`📑 Sheet "${sheetName}" rows:`, csv.split("\n").length);
        console.log(`🔍 Preview of "${sheetName}":\n`, csv.slice(0, 200), "...");
        csvPieces.push(`# Sheet: ${sheetName}\n${csv}`);
      }
    }
    if (csvPieces.length === 0) throw new Error("No sheets or empty data.");

    const csvAll = csvPieces.join("\n\n");

    // 3) Chunk CSV to avoid token blow-ups
    const chunks = chunkText(csvAll);
    console.log("✂️ CSV split into", chunks.length, "chunks");
    chunks.forEach((chunk, i) => {
      console.log(`📦 Chunk ${i + 1} size:`, chunk.length, "chars");
    });

    // 4) Build prompt
    const inputBlocks: any[] = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: systemPrompt

          }
        ],
      }
    ];

    chunks.forEach((chunk, i) => {
      inputBlocks.push({
        role: "user",
        content: [
          {
            type: "input_text",
            text: `CSV CHUNK ${i + 1}/${chunks.length}\n\n` +
                  "```csv\n" + chunk + "\n```"
          }
        ],
      });
    });

    console.log("📝 Prompt blocks ready:", inputBlocks.length);
    console.log("📝 First block content preview:\n", inputBlocks[0].content[0].text);

    // 5) Call GPT
    const response = await client.responses.create({
      model: "gpt-4.1",
      input: inputBlocks,
    });

    console.log("🤖 Raw GPT response:", JSON.stringify(response, null, 2));

    const outputText = response.output_text || "(No output)";
    console.log("📤 Model output text:\n", outputText);

    return { messages: [new AIMessage(outputText)] };
  };

  const workflow = new StateGraph(state)
    .addNode("generalQuestion", agent)
    .addEdge("__start__", "generalQuestion")
    .addEdge("generalQuestion", "__end__");

  const graph = workflow.compile();
  const inputs = { messages: [new SystemMessage(systemPrompt)] };

  let finalState: any;
  for await (const output of await graph.stream(inputs)) {
    for (const [, value] of Object.entries(output)) finalState = value;
  }
  console.log(finalState)
  return finalState;
}

await talkToAgent(
  "https://utfs.io/f/HPU3nx2LdstJvZk2qccVqhACknled54zo6Sm2BLQG9txuiTU",
  "123"
);
