import Link from "next/link";
import { notFound } from "next/navigation";
import { getNewsArticleById } from "@/lib/news/store";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function NewsPostPage({ params }: PageProps) {
  const { locale, id } = await params;
  const numericId = Number(id);

  if (!Number.isFinite(numericId)) {
    notFound();
  }

  const article = await getNewsArticleById(numericId);
  if (!article) {
    notFound();
  }

  const paragraphs = article.fullArticle
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
      <Link href={`/${locale}/Landing/News`} className="text-sm text-primary hover:underline">
        ← Back to news feed
      </Link>

      <h1 className="mt-4 text-4xl font-semibold leading-tight">{article.headline}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {article.sourcePublisher} • {new Date(article.createdAt).toLocaleString()}
      </p>

      <img
        src={article.imageUrl}
        alt={article.headline}
        className="mt-6 h-[340px] w-full rounded-2xl object-cover"
        referrerPolicy="no-referrer"
      />

      <div className="mt-8 space-y-4 text-base leading-7">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-8 rounded-xl border p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Original source</h2>
        <Link
          href={article.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-primary hover:underline"
        >
          {article.sourceTitle}
        </Link>
      </div>
    </article>
  );
}
