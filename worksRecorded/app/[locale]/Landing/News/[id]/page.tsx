import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getNewsArticleById } from "@/lib/news/store";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isFinite(numericId)) {
    return { title: "News Article" };
  }

  const article = await getNewsArticleById(numericId);
  if (!article) {
    return { title: "News Article" };
  }

  return {
    title: article.seoTitle,
    description: article.seoDescription,
    keywords: article.seoKeywords,
    openGraph: {
      title: article.seoTitle,
      description: article.seoDescription,
      type: "article",
      images: [{ url: article.imageUrl }],
    },
  };
}

function renderFormattedArticle(content: string) {
  const blocks = content
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    if (block.startsWith("## ")) {
      return (
        <h2 key={index} className="mt-8 text-2xl font-semibold leading-tight">
          {block.replace(/^##\s+/, "")}
        </h2>
      );
    }

    if (block.startsWith("> ")) {
      return (
        <blockquote
          key={index}
          className="border-l-4 border-primary/70 bg-muted/40 px-4 py-3 text-lg italic text-muted-foreground"
        >
          {block.replace(/^>\s+/, "")}
        </blockquote>
      );
    }

    if (block.startsWith("- ")) {
      const items = block
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- "))
        .map((line) => line.replace(/^-\s+/, ""));

      return (
        <ul key={index} className="list-disc space-y-2 pl-6 text-base leading-7 marker:text-primary">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }

    return (
      <p key={index} className="text-base leading-7 text-foreground/90">
        {block}
      </p>
    );
  });
}

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

  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
      <Link href={`/${locale}/Landing/News`} className="text-sm text-primary hover:underline">
        ← Back to news feed
      </Link>

      <h1 className="mt-4 text-4xl font-semibold leading-tight">{article.headline}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {article.sourcePublisher} • {new Date(article.createdAt).toLocaleString()}
      </p>
      <p className="mt-2 text-sm italic text-muted-foreground">
        By WorksRecorded Field Desk — practical notes on AI tools and AI in construction.
      </p>

      {article.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span key={tag} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}

      <img
        src={article.imageUrl}
        alt={article.headline}
        className="mt-6 h-[340px] w-full rounded-2xl object-cover"
        referrerPolicy="no-referrer"
      />

      <div className="mt-8 space-y-5">{renderFormattedArticle(article.fullArticle)}</div>

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
