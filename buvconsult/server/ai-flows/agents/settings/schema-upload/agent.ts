//C:\Users\user\MVP\Buvconsult-deploy\buvconsult\components\AI\SiteDiary\agent.ts


import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import * as XLSX from "xlsx";
import { systemPrompt } from "@/server/ai-flows/agents/settings/schema-upload/prompts";


const MAX_CHARS = 120_000;

// Recursive Node schema where `children` is OPTIONAL and, if present, must be non-empty.
// Children: optional, may be null, or a non-empty array of Node
const NodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    code: z.string(),
    type: z.string(),
    children: z.union([z.array(NodeSchema).min(1), z.null()]).optional(),
  }).strict()
);

// ✅ Top-level must be an object for OpenAI structured outputs
const WrappedSchema = z.object({
  tree: z.array(NodeSchema),
});

function chunkText(s: string, size = MAX_CHARS) {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

export async function parseExcelToTree(url: string, buf) {

  
  // 2) Convert Excel → CSV (all sheets)
  const wb = XLSX.read(buf, { type: "buffer" });


  const csvPieces: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ",", RS: "\n" }).trim();
    if (csv) {
 
      csvPieces.push(`# Sheet: ${sheetName}\n${csv}`);
    }
  }

  const csvAll = csvPieces.join("\n\n");
  const chunks = chunkText(csvAll);
 

  // 3) LangChain LLM with structured output (schema = Node object at the root)
  const llm = new ChatOpenAI({
    model: "gpt-4.1",
    temperature: 0,
  });

  const structured = llm.withStructuredOutput(WrappedSchema);

  const messages: [string, string][] = [
    ["system", systemPrompt],
    ...chunks.map<[string, string]>((c, i) => [
      "human",
      `CSV CHUNK ${i + 1}/${chunks.length}\n\n\`\`\`csv\n${c}\n\`\`\``,
    ]),
  ];

 
  // 4) Invoke model (returns parsed & validated Node object)
  const tree = await structured.invoke(messages);


  return tree;
}

// Example usage:
