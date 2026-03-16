import OpenAI from "openai";
import type { NewsSourceItem } from "@/lib/news/rss";

export type GeneratedNewsArticle = {
  headline: string;
  summary: string;
  fullArticle: string;
  imageUrl: string;
  sourceTitle: string;
  sourceUrl: string;
  sourcePublisher: string;
};

function fallbackArticle(item: NewsSourceItem, imageUrl: string): GeneratedNewsArticle {
  const cleanedSnippet = (item.snippet || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const summary = cleanedSnippet
    ? cleanedSnippet.slice(0, 180)
    : `${item.source} reported a new update related to AI and construction workflows.`;

  return {
    headline: item.title,
    summary,
    fullArticle: [
      `${item.source} reported: ${item.title}.`,
      cleanedSnippet || "The original article contains further detail and context.",
      "This post is generated from a single source topic to keep updates focused.",
    ].join("\n\n"),
    imageUrl,
    sourceTitle: item.title,
    sourceUrl: item.link,
    sourcePublisher: item.source,
  };
}

export async function generateNewsArticleFromTopic(item: NewsSourceItem, imageUrl: string) {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackArticle(item, imageUrl);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You write a short, clear one-topic AI+construction news post. Return strict JSON only.",
      },
      {
        role: "user",
        content: `Using this single source item, produce JSON with keys: headline, summary, fullArticle. Rules: summary max 220 chars, fullArticle 3 short paragraphs, factual and non-speculative. Input: ${JSON.stringify(
          {
            title: item.title,
            source: item.source,
            publishedAt: item.publishedAt,
            link: item.link,
            snippet: item.snippet,
          }
        )}`,
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    return fallbackArticle(item, imageUrl);
  }

  const parsed = JSON.parse(rawContent) as Partial<GeneratedNewsArticle>;

  return {
    headline: parsed.headline || item.title,
    summary: parsed.summary || fallbackArticle(item, imageUrl).summary,
    fullArticle: parsed.fullArticle || fallbackArticle(item, imageUrl).fullArticle,
    imageUrl,
    sourceTitle: item.title,
    sourceUrl: item.link,
    sourcePublisher: item.source,
  };
}
