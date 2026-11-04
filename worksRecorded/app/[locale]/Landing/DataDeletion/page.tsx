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
		path: "/Landing/DataDeletion",
		title: "Data Deletion | WorksRecorded",
		description:
			"How to request deletion of WorksRecorded account and WhatsApp data.",
		keywords: ["WorksRecorded", "data deletion", "WhatsApp data"],
	});
}

export default function Page() {
	return <ClientPage />;
}
