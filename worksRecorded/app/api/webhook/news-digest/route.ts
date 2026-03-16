import { NextResponse } from "next/server";
import { fetchNewsSourceItems } from "@/lib/news/rss";
<<<<<<< HEAD
import { generateHourlyNewsArticle } from "@/lib/news/generate";
import { getLastPublishedAt, saveNewsArticle } from "@/lib/news/store";
=======
import { generateNewsArticleFromTopic } from "@/lib/news/generate";
import { createTopicKey, getExistingNewsKeys, saveNewsArticle } from "@/lib/news/store";

function buildUniqueImageUrl(topicKey: string, imageUrl: string | undefined, usedImages: Set<string>) {
  if (imageUrl && !usedImages.has(imageUrl)) return imageUrl;
  return `https://picsum.photos/seed/${encodeURIComponent(`${topicKey}-${Date.now()}`)}/1200/700`;
}
>>>>>>> codex/add-automatic-news-feed-for-ai-and-construction-5ubcea

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

<<<<<<< HEAD
  const latestPublishedAt = await getLastPublishedAt();
  if (latestPublishedAt) {
    const minutesSinceLastPost =
      (Date.now() - new Date(latestPublishedAt).getTime()) / (1000 * 60);

    if (minutesSinceLastPost < 50) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Recent article already exists." });
    }
  }

  const sourceItems = await fetchNewsSourceItems();
  const article = await generateHourlyNewsArticle(sourceItems);

  await saveNewsArticle(article);
=======
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
>>>>>>> codex/add-automatic-news-feed-for-ai-and-construction-5ubcea

  return NextResponse.json({
    ok: true,
    headline: article.headline,
<<<<<<< HEAD
    sourceCount: article.sourceLinks.length,
=======
    topicKey,
    sourceUrl: article.sourceUrl,
>>>>>>> codex/add-automatic-news-feed-for-ai-and-construction-5ubcea
  });
}
