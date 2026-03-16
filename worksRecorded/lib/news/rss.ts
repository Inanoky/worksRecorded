export type NewsSourceItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  snippet?: string;
};

const FEED_URLS = [
  "https://news.google.com/rss/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en",
  "https://news.google.com/rss/search?q=construction+technology&hl=en-US&gl=US&ceid=US:en",
];

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function firstMatch(content: string, regex: RegExp) {
  const match = content.match(regex);
  return match?.[1] ? decodeHtmlEntities(match[1]) : "";
}

function extractImage(itemXml: string) {
  const mediaContent = itemXml.match(/<media:content[^>]*url="([^"]+)"/i)?.[1];
  if (mediaContent) return mediaContent;

  const mediaThumb = itemXml.match(/<media:thumbnail[^>]*url="([^"]+)"/i)?.[1];
  if (mediaThumb) return mediaThumb;

  const enclosure = itemXml.match(/<enclosure[^>]*url="([^"]+)"/i)?.[1];
  if (enclosure) return enclosure;

  return undefined;
}

function parseRssFeed(xml: string): NewsSourceItem[] {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) ?? [];

  return items.map((itemXml) => ({
    title: firstMatch(itemXml, /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || firstMatch(itemXml, /<title>([\s\S]*?)<\/title>/i),
    link: firstMatch(itemXml, /<link>([\s\S]*?)<\/link>/i),
    source: firstMatch(itemXml, /<source[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/source>/i) || firstMatch(itemXml, /<source[^>]*>([\s\S]*?)<\/source>/i) || "Unknown source",
    publishedAt: firstMatch(itemXml, /<pubDate>([\s\S]*?)<\/pubDate>/i),
    snippet: firstMatch(itemXml, /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i),
    imageUrl: extractImage(itemXml),
  }));
}

export async function fetchNewsSourceItems(limit = 12) {
  const responses = await Promise.all(
    FEED_URLS.map(async (url) => {
      const response = await fetch(url, {
        headers: { "User-Agent": "WorksRecordedNewsBot/1.0" },
        next: { revalidate: 1800 },
      });

      if (!response.ok) {
        throw new Error(`Unable to fetch RSS feed: ${response.status}`);
      }

      return response.text();
    })
  );

  const merged = responses.flatMap((xml) => parseRssFeed(xml));
  const deduped = Array.from(new Map(merged.map((item) => [item.link, item])).values());

  return deduped
    .filter((item) => item.title && item.link)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
}
