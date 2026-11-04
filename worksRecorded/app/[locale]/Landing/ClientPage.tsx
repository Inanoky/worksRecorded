"use client";

import { useLocale } from "next-intl";

import AgentLandingPage from "@/components/landing/agents/AgentLandingPage";

import { buildLandingJsonLd } from "@/lib/seo/landingMetadata";

export default function LandingPage() {
	const locale = useLocale();
	const jsonLd = buildLandingJsonLd(locale);
	return (
		<>
			<script type="application/ld+json">
				{JSON.stringify(jsonLd).replace(/</g, "\\u003c")}
			</script>
			<AgentLandingPage />
		</>
	);
}
