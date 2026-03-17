import Link from "next/link";
import { getLatestNewsArticles } from "@/lib/news/store";

import type { Metadata } from "next";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";
type PageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";


export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/Landing/News",
    title: "AI Tools & AI in Construction News | WorksRecorded",
    description:
      "Read hourly AI news posts focused on AI tools and AI in construction with summaries and source links.",
    keywords: [
      "construction software",
      "AI tools",
      "AI in construction",
      "construction technology",
      "WorksRecorded",
    ],
  });
}

export default async function NewsPage({ params }: PageProps) {
  const { locale } = await params;
  const articles = await getLatestNewsArticles(30);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
      <div className="mb-8 space-y-3">
        <h1 className="text-4xl font-semibold md:text-5xl">AI Tools & AI in Construction News</h1>
        <p className="max-w-2xl text-muted-foreground">
          One focused topic per post, generated hourly. Open any card to read the full article.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/${locale}/Landing/News/${article.id}`}
            target="_blank"
            rel="noreferrer"
            className="overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <img
              src={article.imageUrl}
              alt={article.headline}
              className="h-52 w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />

            <div className="space-y-3 p-5">
              <h2 className="line-clamp-2 text-2xl font-semibold">{article.headline}</h2>
              <p className="text-sm text-muted-foreground">
                Published {new Date(article.createdAt).toLocaleString()}
              </p>
              <p className="line-clamp-4 leading-relaxed text-muted-foreground">{article.summary}</p>
            </div>
          </Link>
        ))}

        {!articles.length && (
          <div className="rounded-xl border p-8 text-center text-muted-foreground md:col-span-2">
            No article yet. The hourly cron job will publish once it finds a new topic.
          </div>
        )}
      </div>
    </section>
  );
}