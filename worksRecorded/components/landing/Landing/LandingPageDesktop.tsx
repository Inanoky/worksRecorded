// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\components\landing\Landing\LandingPageDesktop.tsx

"use client";

import Link from "next/link";
import Image from "next/image";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { WhatsAppIcon } from "@/components/ui/whatsappIcon";
import LandingHero from "@/public/frontend/pages/Home/LandingHero.png";
import ScreenshotSiteDiary from "@/public/frontend/pages/Home/ScreenshotSiteDiary.png";

import { Features } from "@/components/landing/Features";
import { WhatDoWeDo, HowDoWeDoThat, Why } from "@/components/landing/Landing/Text";

export default function LandingPage() {
  const t = useTranslations("LandingPageDesktop");

  return (
    <>
      {/* TOP HEADER */}
      <section className="bg-slate-50/60 dark:bg-slate-950 ">
        <div className="w-full max-w-8xl mx-auto px-4 lg:px-6 py-10 lg:py-14 text-center">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-xs font-medium text-primary tracking-tight">
            {t("topPill")}
          </span>

          <h1 className="mt-5 text-3xl sm:text-4xl md:text-6xl font-semibold leading-tight">
            {t("heroTitle")}
          </h1>

          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            {t("smallDescription")}
          </p>

          <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
            <RegisterLink>
              <Button size="lg">{t("startFreeTrial")}</Button>
            </RegisterLink>

            <Link
  href="https://wa.me/37124885690"
  target="_blank"
  rel="noopener noreferrer"
>
<Button size="lg" variant="outline">
  <WhatsAppIcon className="w-7 h-7 mr-2" />
  {t("signIn")}
</Button>
</Link>

            <span className="text-xs text-muted-foreground">{t("noCardNote")}</span>
          </div>
        </div>
      </section>

      {/* VIDEO (embedded nicely) */}
      <section className="bg-slate-50/60 dark:bg-slate-950 ">
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 pb-10 lg:pb-12">
          <div className="relative rounded-2xl border bg-background shadow-2xl overflow-hidden">
            {/* subtle glow */}
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-primary/10 via-emerald-100/40 to-transparent dark:from-primary/20 dark:via-primary/5 blur-2xl" />

            {/* responsive 16:9 */}
            <div className="relative w-full aspect-video">
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube-nocookie.com/embed/agwUZ3InxYk?rel=0&modestbranding=1&playsinline=1"
                title="WorksRecorded demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground text-center">
            2-minute walkthrough — how WhatsApp updates become a structured site diary.
          </p>
        </div>
      </section>

      {/* LARGE WIDE IMAGE */}
      <section className="bg-slate-50/60 dark:bg-slate-950 ">
        <div className="w-full max-w-7xl mx-auto px-0 lg:px-4 pb-12 lg:pb-16">
          <div className="rounded-2xl border bg-background shadow-2xl overflow-hidden">
            <Image
              src={LandingHero}
              alt={t("heroImageAlt")}
              priority
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2 – What you capture every day */}
      <section className="bg-background">
        <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-14 lg:py-20">
          <div className="grid gap-10 lg:gap-14 lg:grid-cols-[1.1fr,1fr] items-center">
            {/* LEFT – Text */}
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary tracking-tight">
                {t("section2Pill")}
              </span>

              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl font-semibold leading-tight">
                  {t("section2Title")}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
                  {t("section2Description")}
                </p>
              </div>

              {/* Existing bullet list */}
              <WhatDoWeDo />
            </div>

            {/* RIGHT – Screenshot */}
            <div className="relative">
              {/* Glow / shadow behind */}
              <div className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-primary/10 via-emerald-100/40 to-transparent dark:from-primary/20 dark:via-primary/5 blur-2xl" />

              <div className="rounded-2xl border bg-background shadow-2xl overflow-hidden">
                <Image
                  src={ScreenshotSiteDiary}
                  alt={t("section2ImageAlt")}
                  priority
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Small caption */}
              <p className="mt-3 text-xs text-muted-foreground text-center">
                {t("section2Caption")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 – How we help + why different */}
      <section className="bg-slate-50/60 dark:bg-slate-950 ">
        <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-12 lg:py-16 grid gap-12 lg:grid-cols-2">
          <div>
            <HowDoWeDoThat />
          </div>
          <div>
            <Why />
          </div>
        </div>
      </section>

      {/* Existing features section
      <Features /> */}
    </>
  );
}
