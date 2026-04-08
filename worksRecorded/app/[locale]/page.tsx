import type { Metadata } from "next";
import LandingPageDesktop from "@/components/landing/Landing/LandingPageDesktop";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";
import PrefetchNewsRoute from "./Landing/News/PrefetchNewsRoute";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "",
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

export default async function LocaleHomePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <>
      <PrefetchNewsRoute locale={locale} />
      <LandingPageDesktop />
    </>
  );
}
