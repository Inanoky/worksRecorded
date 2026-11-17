import { redirect } from "next/navigation";
import LegacyLandingPage from "@/components/landing/Landing/LegacyLandingPage";
import { getHomeDestination } from "@/lib/auth/home-entry";
import { buildLandingJsonLd } from "@/lib/seo/landingMetadata";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LandingPage({ params }: PageProps) {
  const { locale } = await params;
  const destination = await getHomeDestination(locale);
  if (destination === "/dashboard") redirect(destination);
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
