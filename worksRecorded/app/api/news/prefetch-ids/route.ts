import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getLatestNewsArticles } from "@/lib/news/store";

const getCachedPrefetchIds = unstable_cache(
  async () => {
    const articles = await getLatestNewsArticles(6);
    return articles.map((article) => article.id);
  },
  ["landing-news-prefetch-ids"],
  { revalidate: 300 }
);

export async function GET() {
  const ids = await getCachedPrefetchIds();

  return NextResponse.json(
    { ids },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
