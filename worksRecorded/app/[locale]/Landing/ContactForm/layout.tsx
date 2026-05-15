import type { Metadata } from "next";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/Landing/ContactForm",
    title: "Contact WorksRecorded | Construction AI Software",
    description:
      "Contact WorksRecorded to discuss construction site diaries, timesheets, BIS integration, and custom AI automation for your team.",
    keywords: [
      "contact WorksRecorded",
      "construction software demo",
      "construction AI consultation",
      "BIS integration support",
    ],
  });
}

export default function ContactFormLayout({ children }: LayoutProps) {
  return children;
}
