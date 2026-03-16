import OpenAI from "openai";
import type { NewsSourceItem } from "@/lib/news/rss";

export type GeneratedNewsArticle = {
  headline: string;
  summary: string;
<<<<<<< HEAD
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
=======
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
>>>>>>> codex/add-automatic-news-feed-for-ai-and-construction-5ubcea
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
<<<<<<< HEAD
          "You create concise hourly market briefs for AI and construction professionals. Return strict JSON.",
      },
      {
        role: "user",
        content: `Create a short article based on the latest news list. Keep it factual, under 130 words, and include up to 4 source links. News input: ${JSON.stringify(context)}`,
=======
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
>>>>>>> codex/add-automatic-news-feed-for-ai-and-construction-5ubcea
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
<<<<<<< HEAD
    return fallbackArticle(items);
=======
    return fallbackArticle(item, imageUrl);
>>>>>>> codex/add-automatic-news-feed-for-ai-and-construction-5ubcea
  }

  const parsed = JSON.parse(rawContent) as Partial<GeneratedNewsArticle>;

  return {
<<<<<<< HEAD
    headline: parsed.headline || "Hourly AI & Construction Briefing",
    summary: parsed.summary || fallbackArticle(items).summary,
    imageUrl: items.find((item) => item.imageUrl)?.imageUrl || fallbackArticle(items).imageUrl,
    sourceLinks:
      parsed.sourceLinks?.filter((link) => link?.title && link?.url).slice(0, 4) ||
      fallbackArticle(items).sourceLinks,
=======
    headline: parsed.headline || item.title,
    summary: parsed.summary || fallbackArticle(item, imageUrl).summary,
    fullArticle: parsed.fullArticle || fallbackArticle(item, imageUrl).fullArticle,
    imageUrl,
    sourceTitle: item.title,
    sourceUrl: item.link,
    sourcePublisher: item.source,
>>>>>>> codex/add-automatic-news-feed-for-ai-and-construction-5ubcea
  };
}
