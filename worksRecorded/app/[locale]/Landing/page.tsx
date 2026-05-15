import type { Metadata } from "next";
import LandingPageDesktop from "@/components/landing/Landing/LandingPageDesktop";
import {
  buildLandingJsonLd,
  buildLandingMetadata,
} from "@/lib/seo/landingMetadata";
import PrefetchNewsRoute from "./News/PrefetchNewsRoute";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/Landing",
    title: "WorksRecorded | WhatsApp site diary",
    description:
      "WorksRecorded helps construction teams capture site records, timesheets, and analytics with AI-powered workflows.",
    keywords: [
      "construction software",
      "AI tools for construction",
      "site diary",
      "timesheets",
      "construction analytics",
    ],
  });
}

export default async function LandingPage({ params }: PageProps) {
  const { locale } = await params;
  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildLandingJsonLd(locale)),
        }}
      />
      <PrefetchNewsRoute locale={locale} />
      <LandingPageDesktop />
    </>
  );
}
