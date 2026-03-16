import { NextResponse } from "next/server";
import { fetchNewsSourceItems } from "@/lib/news/rss";
import { generateNewsArticleFromTopic } from "@/lib/news/generate";
import { createTopicKey, getExistingNewsKeys, saveNewsArticle } from "@/lib/news/store";

function topicToImageQuery(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes("drone")) return "construction drone ai site";
  if (normalized.includes("robot")) return "construction robotics ai";
  if (normalized.includes("safety")) return "construction worker safety technology";
  if (normalized.includes("planning") || normalized.includes("schedule")) {
    return "construction planning software";
  }

  return "ai tools construction technology";
}

function buildTopicRelevantImageUrl(sourceImageUrl: string | undefined, title: string, usedImages: Set<string>) {
  if (sourceImageUrl && !usedImages.has(sourceImageUrl)) return sourceImageUrl;

  const query = topicToImageQuery(title)
    .replace(/\s+/g, " ")
    .trim();

  return `https://placehold.co/1200x700/png?text=${encodeURIComponent(query)}&font=inter`;
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
  const imageUrl = buildTopicRelevantImageUrl(selected.imageUrl, selected.title, existing.imageUrls);
  const article = await generateNewsArticleFromTopic(selected, imageUrl);

  await saveNewsArticle(article, topicKey);

  return NextResponse.json({
    ok: true,
    headline: article.headline,
    topicKey,
    sourceUrl: article.sourceUrl,
  });
}
