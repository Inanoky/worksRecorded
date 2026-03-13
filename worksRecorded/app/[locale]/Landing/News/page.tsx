import Link from "next/link";
import { getLatestNewsArticles } from "@/lib/news/store";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const articles = await getLatestNewsArticles(30);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
      <div className="mb-8 space-y-3">
        <h1 className="text-4xl font-semibold md:text-5xl">AI & Construction News Feed</h1>
        <p className="max-w-2xl text-muted-foreground">
          This feed auto-publishes an LLM-generated briefing every hour from the latest AI and construction headlines.
        </p>
      </div>

      <div className="grid gap-6">
        {articles.map((article) => (
          <article key={article.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <img
              src={article.imageUrl}
              alt={article.headline}
              className="h-52 w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-4 p-5">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">{article.headline}</h2>
                <p className="text-sm text-muted-foreground">
                  Published {new Date(article.createdAt).toLocaleString()}
                </p>
              </div>

              <p className="leading-relaxed">{article.summary}</p>

              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sources</h3>
                <ul className="list-inside list-disc space-y-1">
                  {article.sourceLinks.map((source) => (
                    <li key={source.url}>
                      <Link href={source.url} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                        {source.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}

        {!articles.length && (
          <div className="rounded-xl border p-8 text-center text-muted-foreground">
            No article yet. The hourly cron job will populate this feed after the first run.
          </div>
        )}
      </div>
    </section>
  );
}
