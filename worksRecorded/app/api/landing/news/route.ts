import { NextResponse } from "next/server";
import { isLandingLocale } from "@/components/landing/navigation/landing-routes";
import { buildNewsArticleMetadata } from "@/lib/news/article-metadata";
import { getNewsArticleById, getPaginatedNewsArticles } from "@/lib/news/store";
import { serializeLandingMetadata } from "@/server/landing/navigation-metadata";

export async function GET(request: Request) {
	const query = new URL(request.url).searchParams;
	const locale = query.get("locale") || "lv";
	if (!isLandingLocale(locale))
		return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
	const id = query.get("id");
	const headers = {
		"Cache-Control":
			"public, max-age=60, s-maxage=300, stale-while-revalidate=600",
	};
	if (id !== null) {
		const articleId = Number(id);
		if (!Number.isSafeInteger(articleId) || articleId < 1)
			return NextResponse.json({ error: "Invalid article" }, { status: 400 });
		const article = await getNewsArticleById(articleId);
		if (!article)
			return NextResponse.json({ error: "Article not found" }, { status: 404 });
		return NextResponse.json(
			{
				article,
				metadata: serializeLandingMetadata(
					buildNewsArticleMetadata(article, locale),
				),
			},
			{ headers },
		);
	}
	const requestedPage = Number(query.get("page") || 1);
	const currentPage =
		Number.isFinite(requestedPage) && requestedPage >= 1
			? Math.floor(requestedPage)
			: 1;
	const result = await getPaginatedNewsArticles(currentPage, 6);
	return NextResponse.json({ ...result, currentPage }, { headers });
}
