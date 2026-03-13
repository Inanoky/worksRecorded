import { sql } from "@vercel/postgres";
import type { GeneratedNewsArticle } from "@/lib/news/generate";

export type StoredNewsArticle = GeneratedNewsArticle & {
  id: number;
  createdAt: string;
};

export async function ensureNewsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS ai_news_feed (
      id SERIAL PRIMARY KEY,
      headline TEXT NOT NULL,
      summary TEXT NOT NULL,
      image_url TEXT NOT NULL,
      source_links JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function getLastPublishedAt() {
  await ensureNewsTable();
  const result = await sql`SELECT created_at FROM ai_news_feed ORDER BY created_at DESC LIMIT 1`;
  return result.rows[0]?.created_at as string | undefined;
}

export async function saveNewsArticle(article: GeneratedNewsArticle) {
  await ensureNewsTable();
  await sql`
    INSERT INTO ai_news_feed (headline, summary, image_url, source_links)
    VALUES (${article.headline}, ${article.summary}, ${article.imageUrl}, ${JSON.stringify(article.sourceLinks)}::jsonb)
  `;
}

export async function getLatestNewsArticles(limit = 24): Promise<StoredNewsArticle[]> {
  await ensureNewsTable();
  const result = await sql`
    SELECT id, headline, summary, image_url, source_links, created_at
    FROM ai_news_feed
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result.rows.map((row) => ({
    id: Number(row.id),
    headline: String(row.headline),
    summary: String(row.summary),
    imageUrl: String(row.image_url),
    sourceLinks: (row.source_links || []) as Array<{ title: string; url: string }>,
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));
}
