import type { Metadata } from "next";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";
import ClientPage from "./ClientPage";

type PageProps = {
	params: Promise<{ locale: string }>;
};

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale } = await params;

	return buildLandingMetadata({
		locale,
		path: "/Landing/Privacy",
		title: "Privacy Policy | WorksRecorded",
		description:
			"Read the WorksRecorded privacy policy for data handling, GDPR rights, and platform security details.",
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
