export type NewsSourceItem = {
  title: string;
  link: string;
  pubDate?: string;
  source: string;
};

const FEEDS = [
  {
    source: "Google News - Artificial Intelligence",
    url: "https://news.google.com/rss/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en",
  },
  {
    source: "Google News - Construction Industry",
    url: "https://news.google.com/rss/search?q=construction+industry&hl=en-US&gl=US&ceid=US:en",
  },
];

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function pullTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function parseRss(xml: string, source: string): NewsSourceItem[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  return items
    .map((item) => ({
      title: pullTag(item, "title"),
      link: pullTag(item, "link"),
      pubDate: pullTag(item, "pubDate"),
      source,
    }))
    .filter((item) => item.title && item.link);
}

export async function fetchLatestNewsFromRss(limit = 12): Promise<NewsSourceItem[]> {
  const responses = await Promise.all(
    FEEDS.map(async (feed) => {
      const response = await fetch(feed.url, {
        headers: { "User-Agent": "WorksRecorded-NewsBot/1.0" },
        next: { revalidate: 1800 },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${feed.source}: ${response.status}`);
      }

      const xml = await response.text();
      return parseRss(xml, feed.source);
    })
  );

  const uniqueByLink = new Map<string, NewsSourceItem>();

  for (const item of responses.flat()) {
    if (!uniqueByLink.has(item.link)) {
      uniqueByLink.set(item.link, item);
    }
  }

  return Array.from(uniqueByLink.values()).slice(0, limit);
}
