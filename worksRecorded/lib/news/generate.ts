import OpenAI from "openai";
import { z } from "zod";
import type { NewsSourceItem } from "@/lib/news/rss";

const articleSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()).min(3).max(4),
});

export type GeneratedNewsArticle = z.infer<typeof articleSchema>;

export async function generateNewsArticle(items: NewsSourceItem[]): Promise<GeneratedNewsArticle> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const client = new OpenAI({ apiKey });

  const prompt = `You are a business news editor. Write a short update that combines current AI and construction developments.

Use only the sources below and avoid making up facts.
Keep the style concise and practical for project teams.

SOURCES:
${items
  .map(
    (item, index) =>
      `${index + 1}. [${item.source}] ${item.title} (${item.pubDate || "unknown date"}) - ${item.link}`
  )
  .join("\n")}`;

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: prompt,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "news_article",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["headline", "summary", "keyPoints"],
          properties: {
            headline: { type: "string" },
            summary: { type: "string", description: "A 90-140 word article." },
            keyPoints: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 4,
            },
          },
        },
      },
    },
  });

  const raw = response.output_text;

  if (!raw) {
    throw new Error("LLM returned empty output");
  }

  const parsed = JSON.parse(raw);
  return articleSchema.parse(parsed);
}
