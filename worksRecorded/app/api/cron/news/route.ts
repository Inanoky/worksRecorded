import { NextResponse } from "next/server";
import { prisma } from "@/lib/utils/db";
import { fetchLatestNewsFromRss } from "@/lib/news/rss";
import { generateNewsArticle } from "@/lib/news/generate";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sourceItems = await fetchLatestNewsFromRss(12);

    if (sourceItems.length < 4) {
      throw new Error("Not enough source items collected to generate article");
    }

    const article = await generateNewsArticle(sourceItems);

    const created = await prisma.newsArticle.create({
      data: {
        title: article.headline,
        summary: article.summary,
        keyPoints: article.keyPoints,
        sourceItems,
      },
    });

    await prisma.newsArticle.deleteMany({
      where: {
        id: {
          notIn: (
            await prisma.newsArticle.findMany({
              orderBy: { createdAt: "desc" },
              take: 120,
              select: { id: true },
            })
          ).map((item) => item.id),
        },
      },
    });

    return NextResponse.json({ ok: true, id: created.id, createdAt: created.createdAt });
  } catch (error) {
    console.error("[news-cron]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
