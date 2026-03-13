import { prisma } from "@/lib/utils/db";
import type { GeneratedNewsArticle } from "@/lib/news/generate";

export type StoredNewsArticle = GeneratedNewsArticle & {
  id: number;
  createdAt: string;
};

type SourceLink = { title: string; url: string };

const hasVercelPostgres = Boolean(process.env.POSTGRES_URL);
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

function parseSourceLinks(value: unknown): SourceLink[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is SourceLink =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as SourceLink).title === "string" &&
        typeof (item as SourceLink).url === "string"
    );
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parseSourceLinks(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

async function ensureNewsTableWithPrisma() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ai_news_feed (
      id SERIAL PRIMARY KEY,
      headline TEXT NOT NULL,
      summary TEXT NOT NULL,
      image_url TEXT NOT NULL,
      source_links JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function ensureNewsTableWithVercelPg() {
  const { sql } = await import("@vercel/postgres");
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

async function ensureNewsTable() {
  if (hasVercelPostgres) {
    await ensureNewsTableWithVercelPg();
    return;
  }

  if (hasDatabaseUrl) {
    await ensureNewsTableWithPrisma();
    return;
  }
}

export async function getLastPublishedAt() {
  await ensureNewsTable();

  if (hasVercelPostgres) {
    const { sql } = await import("@vercel/postgres");
    const result = await sql`SELECT created_at FROM ai_news_feed ORDER BY created_at DESC LIMIT 1`;
    return result.rows[0]?.created_at as string | undefined;
  }

  if (hasDatabaseUrl) {
    const rows = await prisma.$queryRawUnsafe<Array<{ created_at: Date | string }>>(
      `SELECT created_at FROM ai_news_feed ORDER BY created_at DESC LIMIT 1`
    );

    const createdAt = rows[0]?.created_at;
    return createdAt ? new Date(createdAt).toISOString() : undefined;
  }

  return undefined;
}

export async function saveNewsArticle(article: GeneratedNewsArticle) {
  await ensureNewsTable();

  if (hasVercelPostgres) {
    const { sql } = await import("@vercel/postgres");
    await sql`
      INSERT INTO ai_news_feed (headline, summary, image_url, source_links)
      VALUES (${article.headline}, ${article.summary}, ${article.imageUrl}, ${JSON.stringify(article.sourceLinks)}::jsonb)
    `;
    return;
  }

  if (hasDatabaseUrl) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO ai_news_feed (headline, summary, image_url, source_links)
       VALUES ($1, $2, $3, $4::jsonb)`,
      article.headline,
      article.summary,
      article.imageUrl,
      JSON.stringify(article.sourceLinks)
    );
  }
}

export async function getLatestNewsArticles(limit = 24): Promise<StoredNewsArticle[]> {
  await ensureNewsTable();

  if (hasVercelPostgres) {
    const { sql } = await import("@vercel/postgres");
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
      sourceLinks: parseSourceLinks(row.source_links),
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));
  }

  if (hasDatabaseUrl) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: number | string;
        headline: string;
        summary: string;
        image_url: string;
        source_links: unknown;
        created_at: Date | string;
      }>
    >(
      `SELECT id, headline, summary, image_url, source_links, created_at
       FROM ai_news_feed
       ORDER BY created_at DESC
       LIMIT $1`,
      limit
    );

    return rows.map((row) => ({
      id: Number(row.id),
      headline: row.headline,
      summary: row.summary,
      imageUrl: row.image_url,
      sourceLinks: parseSourceLinks(row.source_links),
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  return [];
}
