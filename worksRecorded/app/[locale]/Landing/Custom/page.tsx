import type { Metadata } from "next";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";
import ClientPage from "./ClientPage";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale } = await params;
	return buildLandingMetadata({
		locale,
		path: "/Landing/Custom",
		title: "Custom AI Agents for Construction | WorksRecorded",
		description:
			"Build custom AI workflows for your construction business, from reporting automation to project-specific tools.",
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
