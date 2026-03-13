import { NextResponse } from "next/server";
import { fetchNewsSourceItems } from "@/lib/news/rss";
import { generateHourlyNewsArticle } from "@/lib/news/generate";
import { getLastPublishedAt, saveNewsArticle } from "@/lib/news/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return NextResponse.json({
    ok: true,
    headline: article.headline,
    sourceCount: article.sourceLinks.length,
  });
}
