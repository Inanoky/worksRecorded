// app/(marketing)/custom/page.tsx

import Image from "next/image";
import { useTranslations } from "next-intl";
import Development from "@/public/frontend/pages/CustomSolutions/Development.png";
import Site from "@/public/frontend/pages/CustomSolutions/Site.jpeg";

export default function Page() {
  const t = useTranslations("CustomSolutions");

  return (
    <section className="relative flex items-center justify-center">
      <div className="w-full mx-auto px-4 sm:px-6 py-12 lg:py-20">
        <div className="text-center">
          <h1 className="mt-8 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-medium leading-tight sm:leading-none">
            {t("title")}
          </h1>
        </div>

        {/* Block 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-12 mx-auto mt-12">
          <Image
            src={Site}
            alt={t("images.siteAlt")}
            priority
            className="md:col-span-2 w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl"
          />

          <div className="text-base sm:text-lg md:text-xl leading-relaxed space-y-4 text-center md:text-left">
            <span className="block text-xl sm:text-2xl font-semibold">
              {t("block1.title")}
            </span>

            <p>
              {t("block1.p1.prefix")}{" "}
              <span className="text-primary font-semibold">
                {t("block1.p1.highlight")}
              </span>
              {t("block1.p1.suffix")}
            </p>

            <p>{t("block1.p2")}</p>
            <p>{t("block1.p3")}</p>
          </div>
        </div>

        {/* Block 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-12 mx-auto mt-12">
          <div className="flex flex-col text-base sm:text-lg md:text-xl leading-relaxed space-y-4 text-center md:text-left">
            <span className="text-xl sm:text-2xl font-semibold">
              {t("block2.title")}
            </span>
            <p>{t("block2.p1")}</p>
            <p>{t("block2.p2")}</p>
          </div>

          <Image
            src={Development}
            alt={t("images.developmentAlt")}
            priority
            className="md:col-span-2 w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
