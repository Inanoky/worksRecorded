import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/Landing/BIS-integracija",
    title: "BIS integrācija un automatizācija | WorksRecorded",
    description:
      "BIS automatizācija no WhatsApp: materiālu, būvizstrādājumu un ikdienas darbu aizpildīšana ar WorksRecorded.",
    keywords: [
      "BIS integrācija",
      "BIS automatizācija",
      "WhatsApp BIS",
      "WorksRecorded",
      "AI būvniecībā",
    ],
  });
}

export default async function BISIntegracijaPage({ params }: PageProps) {
  const { locale } = await params;

  if (locale !== "lv") {
    notFound();
  }

  return (
    <section className="p-5 relative flex items-center justify-center">
      <div className="w-full mx-auto max-w-5xl px-4 sm:px-6 py-10 lg:py-20 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-medium leading-tight">
            BIS integrācija
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto">
            Praktiski piemēri, kā WorksRecorded palīdz mazināt dubulto darbu un ietaupīt
            būvdarbu vadītāju laiku.
          </p>
        </div>

        <article className="space-y-4">
          <h2 className="text-2xl sm:text-3xl font-semibold">
            BIS automatizācija. Materiālu un būvizstrādājumu pievienošana caur WhatsApp.
          </h2>
          <p className="text-base sm:text-lg leading-relaxed">
            Viens veids, kā praktiski izmantot AI, lai ietaupītu būvdarbu vadītājiem laiku un
            novērstu dubulto darbu.
          </p>
          <div className="aspect-video w-full overflow-hidden rounded-xl border shadow-xl shadow-black/15">
            <iframe
              title="BIS automatizācija. Materiālu un būvizstrādājumu pievienošana caur WhatsApp."
              src="https://www.youtube.com/embed/78_e52vV0ps"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </article>

        <article className="space-y-4">
          <h2 className="text-2xl sm:text-3xl font-semibold">
            No WhatsApp balss uz BIS sistēmu — tagad tā ir realitāte.
          </h2>
          <p className="text-base sm:text-lg leading-relaxed">
            Turpinām mazināt dubulto darbu un ieviešam ikdienas darbu automātisku aizpildīšanu ar
            WorksRecorded.
          </p>
          <p className="text-base sm:text-lg leading-relaxed font-medium">
            Laika ekonomija — līdz 30 stundām mēnesī.
          </p>
          <div className="aspect-video w-full overflow-hidden rounded-xl border shadow-xl shadow-black/15">
            <iframe
              title="No WhatsApp balss uz BIS sistēmu — tagad tā ir realitāte."
              src="https://www.youtube.com/embed/AYSD96mBqEc"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </article>
      </div>
    </section>
  );
}
