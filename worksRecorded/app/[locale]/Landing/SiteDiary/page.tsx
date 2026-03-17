// app/(marketing)/site-diary/page.tsx

import Image from "next/image";
import { useTranslations } from "next-intl";
import SiteDiary1 from "@/public/frontend/pages/SiteDiary/SiteDiary1.png";
import SiteDiary2 from "@/public/frontend/pages/SiteDiary/SiteDiary2.png";
import WhatsappScreen from "@/public/frontend/pages/SiteDiary/WhatsappScreen.png";

import type { Metadata } from "next";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/Landing/SiteDiary",
    title: "AI Site Diary for Construction Teams | WorksRecorded",
    description:
      "Capture site diary updates via WhatsApp and AI to keep daily construction records accurate and searchable.",
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
  const t = useTranslations("SiteDiary");

  return (
    <section className="p-5 relative flex items-center justify-center">
      <div className="w-full mx-auto px-4 sm:px-6 py-10 lg:py-20">
        <div className="text-center">
          <h1 className="mt-4 sm:mt-8 text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-medium leading-tight sm:leading-none">
            {t("title")}
          </h1>
        </div>

        {/* Block 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-10 mx-auto mt-6 md:mt-12">
          <div className="relative md:col-span-2">
            <Image
              src={SiteDiary2}
              alt={t("images.siteDiaryAlt")}
              priority
              className="w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl shadow-black/40"
            />

            <Image
              src={WhatsappScreen}
              alt={t("images.whatsappAlt")}
              priority
              width={280}
              height={560}
              className="
                absolute bottom-3 right-3
                rounded-xl shadow-xl border z-10
                w-[32%] aspect-[1/2.1679]
                sm:w-[28%]
                md:w-[23.3%] md:bottom-4 md:right-4
              "
            />
          </div>

          <p className="text-base sm:text-lg md:text-xl leading-relaxed text-center md:text-left">
            <span className="block text-xl sm:text-2xl font-semibold">
              {t("block1.title")}
            </span>
            <span className="block h-3 sm:h-4" />
            {t("block1.text")}
          </p>
        </div>

        {/* Block 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-10 mx-auto mt-6 md:mt-12">
          <div className="space-y-3 sm:space-y-4 flex flex-col text-base sm:text-lg md:text-xl leading-relaxed text-center md:text-left">
            <span className="text-xl sm:text-2xl font-semibold">
              {t("block2.title")}
            </span>

            <p>{t("block2.p1")}</p>

            <p>
              {t("block2.p2.prefix")}{" "}
              <span className="text-primary font-bold">
                {t("block2.p2.highlight")}
              </span>
            </p>

            <p>
              {t("block2.p3.prefix")}{" "}
              <span className="text-primary font-bold">
                {t("block2.p3.highlight")}
              </span>
            </p>

            <p>{t("block2.p4")}</p>
            <p>{t("block2.p5")}</p>
          </div>

          <Image
            src={SiteDiary1}
            alt={t("images.galleryAlt")}
            priority
            className="md:col-span-2 w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl shadow-black/40"
          />
        </div>
      </div>
    </section>
  );
}