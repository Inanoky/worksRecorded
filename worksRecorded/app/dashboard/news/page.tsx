import { prisma } from "@/lib/utils/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SourceItem = {
  source: string;
};

function extractSources(value: unknown): SourceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is SourceItem => {
    return typeof item === "object" && item !== null && "source" in item;
  });
}

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const articles = await prisma.newsArticle.findMany({
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">AI & Construction News Feed</h1>
        <p className="text-sm text-muted-foreground">
          Auto-generated every hour using curated RSS feeds and an LLM summary.
        </p>
      </div>

      {articles.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No news yet. The first article appears after the cron job runs.
          </CardContent>
        </Card>
      ) : (
        articles.map((article) => {
          const sources = extractSources(article.sourceItems);

          return (
            <Card key={article.id}>
              <CardHeader className="space-y-2">
                <CardTitle>{article.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(article.createdAt)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6">{article.summary}</p>

                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {article.keyPoints.map((point, index) => (
                    <li key={`${article.id}-point-${index}`}>{point}</li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-2">
                  {sources.map((item, index) => (
                    <Badge key={`${article.id}-source-${index}`} variant="secondary">
                      {item.source}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </section>
  );
}
