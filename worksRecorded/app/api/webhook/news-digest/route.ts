import { NextResponse } from "next/server";
import { fetchNewsSourceItems } from "@/lib/news/rss";
import { generateNewsArticleFromTopic } from "@/lib/news/generate";
import { createTopicKey, getExistingNewsKeys, saveNewsArticle } from "@/lib/news/store";

function topicToKeywords(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes("drone")) return ["construction", "drone", "ai"];
  if (normalized.includes("robot")) return ["construction", "robotics", "ai"];
  if (normalized.includes("safety")) return ["construction", "safety", "technology"];
  if (normalized.includes("planning") || normalized.includes("schedule")) {
    return ["construction", "planning", "software"];
  }

  return ["ai", "tools", "construction", "technology"];
}

async function fetchPexelsPlaceholder(title: string, usedImages: Set<string>) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  const query = topicToKeywords(title).join(" ");
  const endpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=15&page=1`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      photos?: Array<{ src?: { landscape?: string; large2x?: string; large?: string } }>;
    };

    for (const photo of data.photos || []) {
      const candidate = photo.src?.landscape || photo.src?.large2x || photo.src?.large;
      if (candidate && !usedImages.has(candidate)) {
        return candidate;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function buildTopicRelevantImageUrl(
  sourceImageUrl: string | undefined,
  title: string,
  usedImages: Set<string>
) {
  if (sourceImageUrl && !usedImages.has(sourceImageUrl)) return sourceImageUrl;

  const pexelsImage = await fetchPexelsPlaceholder(title, usedImages);
  if (pexelsImage) return pexelsImage;

  return "/default.png";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sourceItems = await fetchNewsSourceItems(25);
  const existing = await getExistingNewsKeys();

  const selected = sourceItems.find((item) => {
    const topicKey = createTopicKey(item.title);
    return !existing.topicKeys.has(topicKey) && !existing.sourceUrls.has(item.link);
  });

  if (!selected) {
    return NextResponse.json({ ok: true, skipped: true, reason: "No new topic found." });
  }

  const topicKey = createTopicKey(selected.title);
  const imageUrl = await buildTopicRelevantImageUrl(selected.imageUrl, selected.title, existing.imageUrls);
  const article = await generateNewsArticleFromTopic(selected, imageUrl);

  await saveNewsArticle(article, topicKey);

  return NextResponse.json({
    ok: true,
    headline: article.headline,
    topicKey,
    sourceUrl: article.sourceUrl,
    usedPexels: imageUrl.includes("pexels.com"),
  });
}
