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

type PexelsResult = {
  imageUrl: string | null;
  status: string;
};

async function queryPexels(
  apiKey: string,
  query: string,
  usedImages: Set<string>
): Promise<PexelsResult> {
  const endpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=40&page=1`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      imageUrl: null,
      status: `http_${response.status}`,
    };
  }

  const data = (await response.json()) as {
    photos?: Array<{ src?: { landscape?: string; large2x?: string; large?: string; original?: string } }>;
  };

  const candidates = (data.photos || [])
    .map((photo) => photo.src?.landscape || photo.src?.large2x || photo.src?.large || photo.src?.original)
    .filter((url): url is string => Boolean(url));

  const unused = candidates.find((url) => !usedImages.has(url));
  if (unused) {
    return {
      imageUrl: unused,
      status: "ok_unused",
    };
  }

  if (candidates[0]) {
    return {
      imageUrl: candidates[0],
      status: "ok_reused",
    };
  }

  return {
    imageUrl: null,
    status: "ok_empty",
  };
}

async function fetchPexelsPlaceholder(title: string, usedImages: Set<string>): Promise<PexelsResult> {
  const apiKey =
    process.env.PEXELS_API_KEY || process.env.PEXELS_API || process.env.PEXELS_API_TOKEN;

  if (!apiKey) {
    return {
      imageUrl: null,
      status: "missing_api_key",
    };
  }

  const keywordQuery = topicToKeywords(title).join(" ");
  const titleQuery = title
    .replace(/[^a-z0-9\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);

  try {
    const firstTry = await queryPexels(apiKey, keywordQuery, usedImages);
    if (firstTry.imageUrl) return firstTry;

    if (titleQuery) {
      const secondTry = await queryPexels(apiKey, titleQuery, usedImages);
      if (secondTry.imageUrl) return secondTry;
      return {
        imageUrl: null,
        status: `${firstTry.status};${secondTry.status}`,
      };
    }

    return firstTry;
  } catch {
    return {
      imageUrl: null,
      status: "request_failed",
    };
  }
}

async function buildTopicRelevantImageUrl(
  sourceImageUrl: string | undefined,
  title: string,
  usedImages: Set<string>
): Promise<{ imageUrl: string; provider: "source" | "pexels" | "default"; pexelsStatus: string }> {
  if (sourceImageUrl && !usedImages.has(sourceImageUrl)) {
    return {
      imageUrl: sourceImageUrl,
      provider: "source",
      pexelsStatus: "not_used",
    };
  }

  const pexelsResult = await fetchPexelsPlaceholder(title, usedImages);
  if (pexelsResult.imageUrl) {
    return {
      imageUrl: pexelsResult.imageUrl,
      provider: "pexels",
      pexelsStatus: pexelsResult.status,
    };
  }

  return {
    imageUrl: "/default.png",
    provider: "default",
    pexelsStatus: pexelsResult.status,
  };
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
  const imageSelection = await buildTopicRelevantImageUrl(
    selected.imageUrl,
    selected.title,
    existing.imageUrls
  );

  const article = await generateNewsArticleFromTopic(selected, imageSelection.imageUrl);

  await saveNewsArticle(article, topicKey);

  return NextResponse.json({
    ok: true,
    headline: article.headline,
    topicKey,
    sourceUrl: article.sourceUrl,
    imageProvider: imageSelection.provider,
    pexelsStatus: imageSelection.pexelsStatus,
  });
}
