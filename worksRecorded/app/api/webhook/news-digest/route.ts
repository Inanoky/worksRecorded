import { NextResponse } from "next/server";
import { fetchNewsSourceItems } from "@/lib/news/rss";
import { generateNewsArticleFromTopic } from "@/lib/news/generate";
import { createTopicKey, getExistingNewsKeys, saveNewsArticle } from "@/lib/news/store";

function buildUniqueImageUrl(topicKey: string, imageUrl: string | undefined, usedImages: Set<string>) {
  if (imageUrl && !usedImages.has(imageUrl)) return imageUrl;
  return `https://picsum.photos/seed/${encodeURIComponent(`${topicKey}-${Date.now()}`)}/1200/700`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sourceItems = await fetchNewsSourceItems(20);
  const existing = await getExistingNewsKeys();

  const selected = sourceItems.find((item) => {
    const topicKey = createTopicKey(item.title);
    return !existing.topicKeys.has(topicKey) && !existing.sourceUrls.has(item.link);
  });

  if (!selected) {
    return NextResponse.json({ ok: true, skipped: true, reason: "No new topic found." });
  }

  const topicKey = createTopicKey(selected.title);
  const imageUrl = buildUniqueImageUrl(topicKey, selected.imageUrl, existing.imageUrls);
  const article = await generateNewsArticleFromTopic(selected, imageUrl);

  await saveNewsArticle(article, topicKey);

  return NextResponse.json({
    ok: true,
    headline: article.headline,
    topicKey,
    sourceUrl: article.sourceUrl,
  });
}
