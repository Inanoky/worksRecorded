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
		path: "/Landing/SiteDiary",
		title: "Construction Work Records AI Agent | WorksRecorded",
		description:
			"Capture site updates through WhatsApp, automate construction documentation, and compare estimates with actual project costs.",
		keywords: [
			"construction site diary",
			"construction cost tracking",
			"WhatsApp construction reporting",
			"AI construction software",
			"WorksRecorded",
		],
	});
}

export default function Page() {
	return <ClientPage />;
}
