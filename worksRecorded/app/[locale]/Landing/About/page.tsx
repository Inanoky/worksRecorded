// app/(marketing)/about/page.tsx

import Image from "next/image";
import { useTranslations } from "next-intl";
import Selfie from "@/public/frontend/pages/About/Selfie.jpg";

export default function Page() {
  const t = useTranslations("About");

  return (
    <section className="relative flex items-center justify-center">
      <div className="w-full mx-auto px-4 sm:px-6 py-12 lg:py-20">
        <div className="text-center">
          <h1 className="mt-8 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-medium leading-tight sm:leading-none">
            {t("title")}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-start w-full py-12 mx-auto mt-12">
          <div className="md:col-span-2 text-base sm:text-lg md:text-xl leading-relaxed space-y-5">
            <p>{t("p1")}</p>
            <p>{t("p2")}</p>
            <p>{t("p3")}</p>
            <p>{t("p4")}</p>
            <p>{t("p5")}</p>
            <p>
              {t("p6.prefix")} <strong>{t("p6.bold")}</strong>
            </p>
            <p>{t("p7")}</p>
            <p>{t("p8")}</p>
            <p>{t("p9")}</p>
            <p>{t("p10")}</p>
            <p>{t("p11")}</p>
          </div>

          <div className="flex justify-center md:justify-end">
            <Image
              src={Selfie}
              alt={t("images.selfieAlt")}
              priority
              width={350}
              height={200}
              className="h-auto w-[70%] sm:w-[60%] md:w-[350px] rounded-2xl border shadow-2xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 w-full py-12 mx-auto mt-12" />
      </div>
    </section>
  );
}
