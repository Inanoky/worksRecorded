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
		path: "/Landing/About",
		title: "About WorksRecorded | AI Construction Platform",
		description:
			"Learn how WorksRecorded helps contractors digitize site communication, reporting, and workflows with AI tools for construction.",
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
