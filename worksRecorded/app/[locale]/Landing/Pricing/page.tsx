// app/(marketing)/pricing/page.tsx

import { useTranslations } from "next-intl";

import type { Metadata } from "next";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/Landing/Pricing",
    title: "WorksRecorded Pricing | Construction AI Software",
    description:
      "View WorksRecorded pricing for AI-powered site records, timesheets, and construction analytics.",
    keywords: [
      "construction software",
      "AI tools",
      "AI in construction",
      "construction technology",
      "WorksRecorded",
    ],
  });
}

export default function Page() {
  const t = useTranslations("Pricing");

  return (
    <section className="relative flex items-center justify-center bg-slate-50/60 dark:bg-slate-950">
      <div className="w-full mx-auto max-w-5xl px-4 sm:px-6 py-12 lg:py-24">
        {/* Heading */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="mt-4 sm:mt-6 text-4xl sm:text-6xl md:text-7xl font-extrabold leading-tight tracking-tighter">
            {t("title.prefix")}{" "}
            <span className="text-primary">{t("title.highlight")}</span>
          </h1>

          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            {t("description")}
          </p>
        </div>

        {/* Main content */}
        <div className="mt-12 md:mt-16 grid grid-cols-1 gap-8 lg:gap-12">
          {/* Pricing cards go here */}
        </div>
      </div>
    </section>
  );
}