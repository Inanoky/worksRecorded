import { prisma } from "@/lib/utils/db";
import type { GeneratedNewsArticle } from "@/lib/news/generate";

export type StoredNewsArticle = GeneratedNewsArticle & {
  id: number;
  topicKey: string;
  createdAt: string;
};

type SourceLink = { title: string; url: string };

const hasVercelPostgres = Boolean(process.env.POSTGRES_URL);
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

function cleanTopicKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

export function createTopicKey(sourceTitle: string) {
  return cleanTopicKey(sourceTitle) || `topic-${Date.now()}`;
}

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

function normalizeArticleRow(row: {
  id: number | string;
  topic_key?: string;
  headline: string;
  summary: string;
  full_article?: string;
  image_url: string;
  source_title?: string;
  source_url?: string;
  source_publisher?: string;
  source_links?: unknown;
  created_at: Date | string;
}): StoredNewsArticle {
  const sourceLinks = parseSourceLinks(row.source_links);
  const sourceTitle = row.source_title || sourceLinks[0]?.title || row.headline;
  const sourceUrl = row.source_url || sourceLinks[0]?.url || "";

  return {
    id: Number(row.id),
    topicKey: row.topic_key || createTopicKey(sourceTitle),
    headline: row.headline,
    summary: row.summary,
    fullArticle: row.full_article || row.summary,
    imageUrl: row.image_url,
    sourceTitle,
    sourceUrl,
    sourcePublisher: row.source_publisher || "Unknown source",
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function ensureNewsTableWithPrisma() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ai_news_feed (
      id SERIAL PRIMARY KEY,
      topic_key TEXT,
      headline TEXT NOT NULL,
      summary TEXT NOT NULL,
      full_article TEXT,
      image_url TEXT NOT NULL,
      source_title TEXT,
      source_url TEXT,
      source_publisher TEXT,
      source_links JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(`ALTER TABLE ai_news_feed ADD COLUMN IF NOT EXISTS topic_key TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE ai_news_feed ADD COLUMN IF NOT EXISTS full_article TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE ai_news_feed ADD COLUMN IF NOT EXISTS source_title TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE ai_news_feed ADD COLUMN IF NOT EXISTS source_url TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE ai_news_feed ADD COLUMN IF NOT EXISTS source_publisher TEXT`);

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS ai_news_feed_topic_key_uidx ON ai_news_feed(topic_key)`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS ai_news_feed_source_url_uidx ON ai_news_feed(source_url)`
  );
}

async function ensureNewsTableWithVercelPg() {
  const { sql } = await import("@vercel/postgres");
  await sql`
    CREATE TABLE IF NOT EXISTS ai_news_feed (
      id SERIAL PRIMARY KEY,
      topic_key TEXT,
      headline TEXT NOT NULL,
      summary TEXT NOT NULL,
      full_article TEXT,
      image_url TEXT NOT NULL,
      source_title TEXT,
      source_url TEXT,
      source_publisher TEXT,
      source_links JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE ai_news_feed ADD COLUMN IF NOT EXISTS topic_key TEXT`;
  await sql`ALTER TABLE ai_news_feed ADD COLUMN IF NOT EXISTS full_article TEXT`;
  await sql`ALTER TABLE ai_news_feed ADD COLUMN IF NOT EXISTS source_title TEXT`;
  await sql`ALTER TABLE ai_news_feed ADD COLUMN IF NOT EXISTS source_url TEXT`;
  await sql`ALTER TABLE ai_news_feed ADD COLUMN IF NOT EXISTS source_publisher TEXT`;

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS ai_news_feed_topic_key_uidx ON ai_news_feed(topic_key)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS ai_news_feed_source_url_uidx ON ai_news_feed(source_url)`;
}

async function ensureNewsTable() {
  if (hasVercelPostgres) {
    await ensureNewsTableWithVercelPg();
    return;
  }

  if (hasDatabaseUrl) {
    await ensureNewsTableWithPrisma();
  }
}

export async function getExistingNewsKeys() {
  await ensureNewsTable();

  if (hasVercelPostgres) {
    const { sql } = await import("@vercel/postgres");
    const result = await sql`
      SELECT topic_key, source_url, image_url
      FROM ai_news_feed
      ORDER BY created_at DESC
      LIMIT 400
    `;

    return {
      topicKeys: new Set(result.rows.map((row) => String(row.topic_key || "")).filter(Boolean)),
      sourceUrls: new Set(result.rows.map((row) => String(row.source_url || "")).filter(Boolean)),
      imageUrls: new Set(result.rows.map((row) => String(row.image_url || "")).filter(Boolean)),
    };
  }

  if (hasDatabaseUrl) {
    const rows = await prisma.$queryRawUnsafe<Array<{ topic_key: string | null; source_url: string | null; image_url: string | null }>>(
      `SELECT topic_key, source_url, image_url FROM ai_news_feed ORDER BY created_at DESC LIMIT 400`
    );

    return {
      topicKeys: new Set(rows.map((row) => row.topic_key || "").filter(Boolean)),
      sourceUrls: new Set(rows.map((row) => row.source_url || "").filter(Boolean)),
      imageUrls: new Set(rows.map((row) => row.image_url || "").filter(Boolean)),
    };
  }

  return {
    topicKeys: new Set<string>(),
    sourceUrls: new Set<string>(),
    imageUrls: new Set<string>(),
  };
}

export async function saveNewsArticle(article: GeneratedNewsArticle, topicKey: string) {
  await ensureNewsTable();

  const links = [{ title: article.sourceTitle, url: article.sourceUrl }];

  if (hasVercelPostgres) {
    const { sql } = await import("@vercel/postgres");
    await sql`
      INSERT INTO ai_news_feed (
        topic_key, headline, summary, full_article, image_url, source_title, source_url, source_publisher, source_links
      )
      VALUES (
        ${topicKey}, ${article.headline}, ${article.summary}, ${article.fullArticle}, ${article.imageUrl},
        ${article.sourceTitle}, ${article.sourceUrl}, ${article.sourcePublisher}, ${JSON.stringify(links)}::jsonb
      )
      ON CONFLICT (topic_key) DO NOTHING
    `;
    return;
  }

  if (hasDatabaseUrl) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO ai_news_feed (
        topic_key, headline, summary, full_article, image_url, source_title, source_url, source_publisher, source_links
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      ON CONFLICT (topic_key) DO NOTHING`,
      topicKey,
      article.headline,
      article.summary,
      article.fullArticle,
      article.imageUrl,
      article.sourceTitle,
      article.sourceUrl,
      article.sourcePublisher,
      JSON.stringify(links)
    );
  }
}

export async function getLatestNewsArticles(limit = 24): Promise<StoredNewsArticle[]> {
  await ensureNewsTable();

  if (hasVercelPostgres) {
    const { sql } = await import("@vercel/postgres");
    const result = await sql`
      SELECT id, topic_key, headline, summary, full_article, image_url, source_title, source_url, source_publisher, source_links, created_at
      FROM ai_news_feed
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return result.rows.map((row) =>
      normalizeArticleRow({
        id: row.id,
        topic_key: row.topic_key as string | undefined,
        headline: String(row.headline),
        summary: String(row.summary),
        full_article: row.full_article as string | undefined,
        image_url: String(row.image_url),
        source_title: row.source_title as string | undefined,
        source_url: row.source_url as string | undefined,
        source_publisher: row.source_publisher as string | undefined,
        source_links: row.source_links,
        created_at: String(row.created_at),
      })
    );
  }

  if (hasDatabaseUrl) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: number | string;
        topic_key: string | null;
        headline: string;
        summary: string;
        full_article: string | null;
        image_url: string;
        source_title: string | null;
        source_url: string | null;
        source_publisher: string | null;
        source_links: unknown;
        created_at: Date | string;
      }>
    >(
      `SELECT id, topic_key, headline, summary, full_article, image_url, source_title, source_url, source_publisher, source_links, created_at
       FROM ai_news_feed
       ORDER BY created_at DESC
       LIMIT $1`,
      limit
    );

    return rows.map((row) => normalizeArticleRow(row));
  }

  return [];
}

export async function getNewsArticleById(id: number): Promise<StoredNewsArticle | null> {
  await ensureNewsTable();

  if (hasVercelPostgres) {
    const { sql } = await import("@vercel/postgres");
    const result = await sql`
      SELECT id, topic_key, headline, summary, full_article, image_url, source_title, source_url, source_publisher, source_links, created_at
      FROM ai_news_feed
      WHERE id = ${id}
      LIMIT 1
    `;

    const row = result.rows[0];
    if (!row) return null;

    return normalizeArticleRow({
      id: row.id,
      topic_key: row.topic_key as string | undefined,
      headline: String(row.headline),
      summary: String(row.summary),
      full_article: row.full_article as string | undefined,
      image_url: String(row.image_url),
      source_title: row.source_title as string | undefined,
      source_url: row.source_url as string | undefined,
      source_publisher: row.source_publisher as string | undefined,
      source_links: row.source_links,
      created_at: String(row.created_at),
    });
  }

  if (hasDatabaseUrl) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: number | string;
        topic_key: string | null;
        headline: string;
        summary: string;
        full_article: string | null;
        image_url: string;
        source_title: string | null;
        source_url: string | null;
        source_publisher: string | null;
        source_links: unknown;
        created_at: Date | string;
      }>
    >(
      `SELECT id, topic_key, headline, summary, full_article, image_url, source_title, source_url, source_publisher, source_links, created_at
       FROM ai_news_feed
       WHERE id = $1
       LIMIT 1`,
      id
    );

    if (!rows[0]) return null;
    return normalizeArticleRow(rows[0]);
  }

  return null;
}
