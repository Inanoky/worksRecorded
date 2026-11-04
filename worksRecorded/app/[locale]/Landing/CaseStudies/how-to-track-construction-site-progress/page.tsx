import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClientPage from "./ClientPage";

import { guidePath, progressGuide } from "./content";

type PageProps = { params: Promise<{ locale: string }> };

const siteUrl = "https://www.worksrecorded.com";

function getGuide(locale: string) {
	if (locale !== "en" && locale !== "lv") notFound();
	return progressGuide[locale];
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale } = await params;
	const guide = getGuide(locale);
	const url = `${siteUrl}/${locale}${guidePath}`;

	return {
		title: guide.seoTitle,
		description: guide.description,
		alternates: {
			canonical: url,
			languages: {
				en: `${siteUrl}/en${guidePath}`,
				lv: `${siteUrl}/lv${guidePath}`,
				"x-default": `${siteUrl}/lv${guidePath}`,
			},
		},
		openGraph: {
			type: "article",
			title: guide.title,
			description: guide.description,
			url,
			siteName: "WorksRecorded",
			locale: locale === "lv" ? "lv_LV" : "en_GB",
			alternateLocale: locale === "lv" ? "en_GB" : "lv_LV",
		},
		twitter: {
			card: "summary",
			title: guide.title,
			description: guide.description,
		},
	};
}

export default async function Page({ params }: PageProps) {
	const { locale } = await params;
	getGuide(locale);
	return <ClientPage />;
}
