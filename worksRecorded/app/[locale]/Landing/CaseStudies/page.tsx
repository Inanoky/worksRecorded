import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";
import { getCaseStudies } from "./_data/caseStudies";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/Landing/CaseStudies",
    title: "Construction AI Case Studies | WorksRecorded",
    description:
      "Explore case studies showing how teams use WorksRecorded to streamline site records and reporting.",
    keywords: [
      "construction software",
      "AI tools",
      "AI in construction",
      "construction technology",
      "WorksRecorded",
    ],
  });
}

export default async function CaseStudiesPage({ params }: PageProps) {
  const { locale } = await params;
  const isLatvian = locale === "lv";
  const caseStudies = getCaseStudies(locale);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold">
          {isLatvian ? "Projektu pieredze" : "Case studies"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isLatvian
            ? "Reāli piemēri, kā komandas izmanto WorksRecorded objektu pierakstiem un atskaitēm ar WhatsApp."
            : "Real examples of how teams use WorksRecorded to capture site records with WhatsApp."}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {caseStudies.map((cs) => (
          <Link
            key={cs.slug}
            href={`/${locale}/Landing/CaseStudies/${cs.slug}`}
            className="group rounded-2xl border bg-background p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-xl bg-muted">
              {cs.coverImage ? (
                <Image
                  src={cs.coverImage}
                  alt={cs.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover transition group-hover:scale-[1.02]"
                />
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{cs.company}</span>
              {cs.location ? <span>• {cs.location}</span> : null}
            </div>

            <h2 className="mt-2 text-lg font-semibold leading-snug">{cs.title}</h2>

            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{cs.excerpt}</p>

            {cs.tags?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {cs.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border px-2 py-1 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </main>
  );
}
