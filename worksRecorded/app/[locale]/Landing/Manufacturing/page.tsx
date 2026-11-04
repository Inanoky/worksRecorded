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
		path: "/Landing/Manufacturing",
		title: "Manufacturing Production Journal | WorksRecorded",
		description:
			"Capture factory work through WhatsApp, calculate operation costs, and compare estimates with actual production data.",
		keywords: [
			"manufacturing software",
			"production journal",
			"manufacturing productivity",
			"WhatsApp work tracking",
			"WorksRecorded",
		],
	});
}

export default function Page() {
	return <ClientPage />;
}
