import OpenAI from "openai";
import type { NewsSourceItem } from "@/lib/news/rss";

export type GeneratedNewsArticle = {
  headline: string;
  summary: string;
  fullArticle: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  tags: string[];
  imageUrl: string;
  sourceTitle: string;
  sourceUrl: string;
  sourcePublisher: string;
};

function fallbackKeywords(item: NewsSourceItem) {
  return [
    "AI tools",
    "AI in construction",
    "construction technology",
    "construction automation",
    "digital construction",
    item.source,
  ];
}

function fallbackArticle(item: NewsSourceItem, imageUrl: string): GeneratedNewsArticle {
  const cleanedSnippet = (item.snippet || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const summary = cleanedSnippet
    ? cleanedSnippet.slice(0, 220)
    : `${item.source} published an update on AI tools and AI in construction.`;

  const tags = ["AI Tools", "AI in Construction", "Construction Tech", "Automation"];
  const seoKeywords = fallbackKeywords(item);

  return {
    headline: item.title,
    summary,
    fullArticle: [
      `${item.source} has published a new development: ${item.title}.`,
      cleanedSnippet ||
        "The source article highlights practical implications for teams adopting AI tools in construction workflows.",
      "From a market perspective, this update signals continued momentum for AI-driven scheduling, reporting, quality control, and site coordination.",
      "Firms evaluating digital transformation should compare tool maturity, integration requirements, and measurable productivity outcomes before deployment.",
      "For readers tracking AI in construction, this topic is relevant because it connects software capabilities to real project delivery constraints.",
    ].join("\n\n"),
    seoTitle: `${item.title} | AI Tools & AI in Construction`,
    seoDescription: summary,
    seoKeywords,
    tags,
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
    model: "gpt-5.1",
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an expert B2B tech journalist. Write engaging, factual, SEO-aware articles focused on AI tools and AI in construction. Return strict JSON only.",
      },
      {
        role: "user",
        content: `Using this single source item, produce JSON with keys: headline, summary, fullArticle, seoTitle, seoDescription, seoKeywords, tags. Rules: headline max 90 chars, summary 180-260 chars, fullArticle 5 short paragraphs (around 400-650 words total), include practical implications for contractors and project managers, and naturally include SEO phrases like 'AI tools', 'AI in construction', 'construction technology', 'automation'. seoKeywords must be 8-14 strings. tags must be 4-8 short strings. Input: ${JSON.stringify(
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
  const fallback = fallbackArticle(item, imageUrl);

  return {
    headline: parsed.headline || fallback.headline,
    summary: parsed.summary || fallback.summary,
    fullArticle: parsed.fullArticle || fallback.fullArticle,
    seoTitle: parsed.seoTitle || fallback.seoTitle,
    seoDescription: parsed.seoDescription || fallback.seoDescription,
    seoKeywords: parsed.seoKeywords?.filter(Boolean).slice(0, 14) || fallback.seoKeywords,
    tags: parsed.tags?.filter(Boolean).slice(0, 8) || fallback.tags,
    imageUrl,
    sourceTitle: item.title,
    sourceUrl: item.link,
    sourcePublisher: item.source,
  };
}
