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
		path: "/Landing/Timesheets",
		title: "Construction Timesheet AI Agent | WorksRecorded",
		description:
			"Automate construction timesheets with WhatsApp clock-ins and AI-powered processing.",
		keywords: [
			"construction timesheets",
			"WhatsApp timesheets",
			"construction software",
			"WorksRecorded",
		],
	});
}

export default function Page() {
	return <ClientPage />;
}
