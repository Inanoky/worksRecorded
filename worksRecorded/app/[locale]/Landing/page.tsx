import LegacyLandingPage from "@/components/landing/Landing/LegacyLandingPage";
import { buildLandingJsonLd } from "@/lib/seo/landingMetadata";

type PageProps = {
	params: Promise<{ locale: string }>;
};

export default async function LandingPage({ params }: PageProps) {
	const { locale } = await params;
	const jsonLd = buildLandingJsonLd(locale);

	return (
		<>
			<script type="application/ld+json">
				{JSON.stringify(jsonLd).replace(/</g, "\\u003c")}
			</script>
			<LegacyLandingPage />
		</>
	);
}
