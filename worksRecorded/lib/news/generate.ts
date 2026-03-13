import OpenAI from "openai";
import type { NewsSourceItem } from "@/lib/news/rss";

export type GeneratedNewsArticle = {
  headline: string;
  summary: string;
  imageUrl: string;
  sourceLinks: Array<{ title: string; url: string }>;
};

function fallbackArticle(items: NewsSourceItem[]): GeneratedNewsArticle {
  const topItems = items.slice(0, 4);

  const summary = topItems
    .map((item, index) => `${index + 1}. ${item.title} (${item.source})`)
    .join(" ");

  return {
    headline: "Hourly AI & Construction Briefing",
    summary,
    imageUrl:
      topItems.find((item) => item.imageUrl)?.imageUrl ||
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80",
    sourceLinks: topItems.map((item) => ({ title: item.title, url: item.link })),
  };
}

export async function generateHourlyNewsArticle(items: NewsSourceItem[]) {
  if (!items.length) {
    return {
      headline: "Hourly AI & Construction Briefing",
      summary: "No fresh items were available in this run.",
      imageUrl:
        "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80",
      sourceLinks: [],
    } satisfies GeneratedNewsArticle;
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallbackArticle(items);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const context = items.slice(0, 8).map((item) => ({
    title: item.title,
    source: item.source,
    link: item.link,
    snippet: item.snippet,
  }));

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You create concise hourly market briefs for AI and construction professionals. Return strict JSON.",
      },
      {
        role: "user",
        content: `Create a short article based on the latest news list. Keep it factual, under 130 words, and include up to 4 source links. News input: ${JSON.stringify(context)}`,
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    return fallbackArticle(items);
  }

  const parsed = JSON.parse(rawContent) as Partial<GeneratedNewsArticle>;

  return {
    headline: parsed.headline || "Hourly AI & Construction Briefing",
    summary: parsed.summary || fallbackArticle(items).summary,
    imageUrl: items.find((item) => item.imageUrl)?.imageUrl || fallbackArticle(items).imageUrl,
    sourceLinks:
      parsed.sourceLinks?.filter((link) => link?.title && link?.url).slice(0, 4) ||
      fallbackArticle(items).sourceLinks,
  };
}
