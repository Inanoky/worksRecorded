import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";
import ClientPage from "./ClientPage";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "AgentLanding" });
	return buildLandingMetadata({
		locale,
		path: "/Landing/Pricing",
		title: `${t("pricingPageTitle")} | WorksRecorded`,
		description: t("pricingDescription"),
		keywords: ["AI agent pricing", "WorksRecorded"],
	});
}

export default function Page() {
	return <ClientPage />;
}
