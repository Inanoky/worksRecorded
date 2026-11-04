import type { Metadata } from "next";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";
import { getExperiencePageCopy } from "./_data/customerExperiences";
import ClientPage from "./ClientPage";

type PageProps = {
	params: Promise<{ locale: string }>;
};

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale } = await params;
	const copy = getExperiencePageCopy(locale);

	return buildLandingMetadata({
		locale,
		path: "/Landing/CaseStudies",
		title: `${copy.title} | WorksRecorded`,
		description: copy.description,
		keywords: [
			"construction software",
			"AI tools",
			"AI in construction",
			"construction technology",
			"WorksRecorded",
		],
	});
}

export default function Page() {
	return <ClientPage />;
}
