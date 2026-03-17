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
    ? cleanedSnippet.slice(0, 260)
    : `${item.source} published a new update on AI tools and AI in construction workflows.`;

  const tags = ["AI Tools", "AI in Construction", "Construction Tech", "Automation"];
  const seoKeywords = fallbackKeywords(item);

  return {
    headline: item.title,
    summary,
    fullArticle: [
      `## The short version`,
      `${item.source} just moved the conversation forward with: **${item.title}**.`,
      `> If this trend continues, AI tools will become part of the daily operating system for site teams, not just a pilot project in head office.`,
      `## Why this matters on real projects`,
      cleanedSnippet ||
        "This story highlights how AI in construction is shifting from demo-stage features toward measurable outcomes in coordination, cost control, and reporting.",
      `## What to watch next`,
      `- Adoption speed among subcontractors and site managers`,
      `- Integration depth with existing scheduling and document systems`,
      `- Whether teams can quantify fewer delays, less rework, and faster decisions`,
      `## Field note from the editor`,
      `If you run projects every day, this is worth tracking now. The winners in construction technology are usually the teams that adopt practical tools early, then iterate faster than everyone else.`,
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
    temperature: 0.75,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a sharp construction-tech columnist with a practical, human voice. Blend business journalism with narrative writing craft while staying factual.",
      },
      {
        role: "user",
        content: `Using this single source item, produce JSON with keys: headline, summary, fullArticle, seoTitle, seoDescription, seoKeywords, tags.

Hard requirements:
- Focus specifically on AI tools and AI in construction.
- Keep claims factual and clearly grounded in the source.
- headline max 95 chars.
- summary 190-300 chars, compelling and clear.
- fullArticle must be markdown-styled and engaging, 500-800 words, with this structure:
  1) '## The short version' (strong hook)
  2) one quote line using markdown blockquote syntax (> ...)
  3) '## Why this matters on real projects'
  4) '## What to watch next' with 3-5 bullet points using '- '
  5) '## Field note from the editor' with a brief personal first-person perspective.
- Use journalism/literary techniques: contrast, concrete examples, and forward-looking tension.
- Naturally include SEO terms: 'AI tools', 'AI in construction', 'construction technology', 'automation'.
- seoKeywords must be 8-14 strings.
- tags must be 4-8 concise strings.

Input: ${JSON.stringify({
          title: item.title,
          source: item.source,
          publishedAt: item.publishedAt,
          link: item.link,
          snippet: item.snippet,
        })}`,
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
