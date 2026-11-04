import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildNewsArticleMetadata } from "@/lib/news/article-metadata";
import { getNewsArticleById } from "@/lib/news/store";
import ClientPage from "./ClientPage";

type PageProps = {
	params: Promise<{ locale: string; id: string }>;
};

export const revalidate = 300;

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale, id } = await params;
	const numericId = Number(id);

	if (!Number.isFinite(numericId)) {
		return { title: "News Article" };
	}

	const article = await getNewsArticleById(numericId);
	if (!article) {
		return { title: "News Article" };
	}

	return buildNewsArticleMetadata(article, locale);
}

export default async function NewsPostPage({ params }: PageProps) {
	const { id } = await params;
	const numericId = Number(id);

	if (!Number.isFinite(numericId)) {
		notFound();
	}

	const article = await getNewsArticleById(numericId);
	if (!article) {
		notFound();
	}

	return <ClientPage article={article} />;
}
