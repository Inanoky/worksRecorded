import type { Metadata } from "next";

import { getPaginatedNewsArticles } from "@/lib/news/store";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";
import ClientPage from "./ClientPage";

type PageProps = {
	params: Promise<{ locale: string }>;
	searchParams?: Promise<{ page?: string }>;
};

export const revalidate = 300;

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
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

const ARTICLES_PER_PAGE = 6;

function getPageNumber(value?: string) {
	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed < 1) {
		return 1;
	}

	return Math.floor(parsed);
}

export default async function NewsPage({ searchParams }: PageProps) {
	const resolvedSearchParams = searchParams ? await searchParams : {};
	const currentPage = getPageNumber(resolvedSearchParams.page);
	const { articles, totalArticles } = await getPaginatedNewsArticles(
		currentPage,
		ARTICLES_PER_PAGE,
	);

	return (
		<ClientPage
			articles={articles}
			totalArticles={totalArticles}
			currentPage={currentPage}
		/>
	);
}
