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
		path: "/Landing/Analytics",
		title: "Construction Financial Analytics AI Agent | WorksRecorded",
		description:
			"Track project progress, productivity, and KPIs with AI-powered construction analytics dashboards.",
		keywords: [
			"construction analytics",
			"project analytics",
			"construction software",
			"WorksRecorded",
		],
	});
}

export default function Page() {
	return <ClientPage />;
}
