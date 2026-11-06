import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getNewsArticleById } from "@/lib/news/store";
import { WORKSRECORDED_LANDING_LINK_TOKEN } from "@/lib/news/worksRecordedPromotion";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export const revalidate = 300;

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

function renderFormattedArticle(content: string, locale: string) {
  const resolvedContent = content.replaceAll(
    WORKSRECORDED_LANDING_LINK_TOKEN,
    `/${locale}/Landing`
  );

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        h2: ({ children }) => (
          <h2 className="mt-8 text-2xl font-semibold leading-tight">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-6 text-xl font-semibold leading-tight">{children}</h3>
        ),
        p: ({ children }) => <p className="text-base leading-7 text-foreground/90">{children}</p>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/70 bg-muted/40 px-4 py-3 text-lg italic text-muted-foreground [&>p]:text-inherit">
            {children}
          </blockquote>
        ),
        ul: ({ children }) => (
          <ul className="list-disc space-y-2 pl-6 text-base leading-7 marker:text-primary">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal space-y-2 pl-6 text-base leading-7 marker:text-primary">{children}</ol>
        ),
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        a: ({ href, children }) => {
          const resolvedHref = href || `/${locale}/Landing`;
          const isExternal = /^https?:\/\//i.test(resolvedHref);

          return (
            <Link
              href={resolvedHref}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noreferrer" : undefined}
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {children}
            </Link>
          );
        },
      }}
    >
      {resolvedContent}
    </ReactMarkdown>
  );
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

      <div className="mt-8 space-y-5">{renderFormattedArticle(article.fullArticle, locale)}</div>

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
