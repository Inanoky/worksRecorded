import type { Metadata } from "next";
import type { StoredNewsArticle } from "./store";

export function buildNewsArticleMetadata(
	article: StoredNewsArticle,
	locale: string,
): Metadata {
	return {
		title: article.seoTitle,
		description: article.seoDescription,
		keywords: article.seoKeywords,
		alternates: {
			canonical: `/${locale}/Landing/News/${article.id}`,
		},
		openGraph: {
			title: article.seoTitle,
			description: article.seoDescription,
			type: "article",
			images: [{ url: article.imageUrl }],
		},
	};
}
