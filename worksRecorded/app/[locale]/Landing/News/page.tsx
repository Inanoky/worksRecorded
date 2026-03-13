import { prisma } from "@/lib/utils/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SourceItem = {
  source: string;
  title?: string;
  link?: string;
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

export default async function NewsLandingPage() {
  const articles = await prisma.newsArticle.findMany({
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  return (
    <section className="p-5 relative flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-20 space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-medium">AI + Construction News</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Fresh short-form updates generated every hour from current industry headlines.
          </p>
        </div>

        {articles.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No news yet. The first post will appear after the hourly job runs.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {articles.map((article) => {
              const sources = extractSources(article.sourceItems);

              return (
                <Card key={article.id}>
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-xl">{article.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(article.createdAt)}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm leading-6">{article.summary}</p>

                    <ul className="list-disc pl-5 text-sm space-y-1">
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
            })}
          </div>
        )}
      </div>
    </section>
  );
}
