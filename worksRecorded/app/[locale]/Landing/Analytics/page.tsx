// app/(marketing)/analytics/page.tsx

import Image from "next/image";
import { useTranslations } from "next-intl";
import Analytics1 from "@/public/frontend/pages/Analytics/Analytics1.png";
import Analytics2 from "@/public/frontend/pages/Analytics/Analytics2.png";

export default function Page() {
  const t = useTranslations("Analytics");

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
              src={Analytics1}
              alt={t("images.overviewAlt")}
              priority
              className="w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl shadow-black/40"
            />
          </div>

          <div className="text-base sm:text-lg md:text-xl leading-relaxed text-center md:text-left">
            <span className="block text-xl sm:text-2xl font-semibold">
              {t("block1.title")}
            </span>
            <span className="block h-3 sm:h-4" />
            {t("block1.text")}
          </div>
        </div>

        {/* Block 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-10 mx-auto mt-6 md:mt-12">
          <div className="flex flex-col text-base sm:text-lg md:text-xl leading-relaxed text-center md:text-left">
            <span className="text-xl sm:text-2xl font-semibold">
              {t("block2.title")}
            </span>
            <span className="block h-3 sm:h-4" />
            <ul className="list-disc pl-5 sm:pl-6 space-y-2 marker:text-primary marker:text-base sm:marker:text-lg">
              <li>{t("block2.li1")}</li>
              <li>{t("block2.li2")}</li>
              <li>{t("block2.li3")}</li>
              <li>{t("block2.li4")}</li>
            </ul>
          </div>

          <Image
            src={Analytics2}
            alt={t("images.detailsAlt")}
            priority
            className="md:col-span-2 w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl shadow-black/40"
          />
        </div>
      </div>
    </section>
  );
}
