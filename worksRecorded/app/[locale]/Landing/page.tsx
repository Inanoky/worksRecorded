"use client";

import Link from "next/link";
import Image from "next/image";
import { RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";
import ScreenshotSiteDiary from "@/public/frontend/pages/Home/ScreenshotSiteDiary.png";
import BisLogo from "@/public/logos/bislogo.png";

import { WhatDoWeDo, HowDoWeDoThat, Why } from "@/components/landing/Landing/Text";

export default function LandingPage() {
  const t = useTranslations("LandingPageDesktop");
  const locale = useLocale();

  const calendlyDemoUrl =
    "https://calendly.com/vjaceslavs-worksrecorded/30min?month=2026-05";

  const noCardNote = t("noCardNote");

  const videoSrc =
    locale === "lv"
      ? "https://www.youtube-nocookie.com/embed/lzRHv2wR_sM?rel=0&modestbranding=1&playsinline=1"
      : "https://www.youtube-nocookie.com/embed/-CfwJd-hI4I?rel=0&modestbranding=1&playsinline=1";

  return (
    <>
      {/* TOP HEADER */}
      <section className="relative overflow-hidden bg-[#f7f8f5] dark:bg-slate-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(22,163,74,0.14),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(22,163,74,0.12),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-emerald-50/70 to-transparent dark:from-emerald-950/20" />

        <div className="relative w-full max-w-8xl mx-auto px-4 lg:px-6 py-10 lg:py-16 text-center">
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white/70 px-4 py-1.5 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur tracking-tight dark:border-emerald-900 dark:bg-white/5 dark:text-emerald-300">
            {t("topPill")}
          </span>

          <h1 className="mt-5 text-4xl sm:text-5xl md:text-7xl font-semibold leading-[0.95] tracking-[-0.05em] text-slate-950 dark:text-white">
            {t("heroTitle")}
          </h1>

          <p className="mt-5 text-sm sm:text-lg leading-7 text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            {t("smallDescription")}
          </p>

          <div className="mt-7 flex flex-wrap justify-center items-center gap-3">
            <Link href={calendlyDemoUrl} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="h-12 w-56 rounded-2xl border border-yellow-400 bg-yellow-400 px-8 text-base font-semibold text-slate-950 shadow-xl shadow-yellow-500/20 hover:bg-yellow-300"
              >
                {t("bookDemo")}
              </Button>
            </Link>

            <RegisterLink>
              <Button
                size="lg"
                className="h-12 w-56 rounded-2xl bg-emerald-700 px-8 text-base font-semibold text-white shadow-xl shadow-emerald-900/25 hover:bg-emerald-800"
              >
                {t("startFreeTrial")}
              </Button>
            </RegisterLink>

            {noCardNote ? (
              <span className="basis-full text-xs text-slate-500 dark:text-slate-400">
                {noCardNote}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {/* VIDEO */}
      <section className="relative overflow-hidden bg-[#f7f8f5] dark:bg-slate-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(22,163,74,0.08),transparent_35%)]" />

        <div className="relative w-full max-w-7xl mx-auto px-4 lg:px-6 pb-10 lg:pb-14">
          <div className="relative rounded-[2rem] border border-white/80 bg-white/90 shadow-2xl shadow-slate-900/10 overflow-hidden ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900">
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-emerald-200/50 via-white to-transparent dark:from-emerald-950/40 dark:via-slate-950 blur-3xl" />

            <div className="relative w-full aspect-video">
              <iframe
                className="absolute inset-0 h-full w-full"
                src={videoSrc}
                title="WorksRecorded demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
            1-minute walkthrough — how WhatsApp updates become a structured site
            diary.
          </p>
        </div>
      </section>

      {/* SECTION 2 – What you capture every day */}
      <section className="bg-white dark:bg-slate-950">
        <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-14 lg:py-24">
          <div className="grid gap-10 lg:gap-14 lg:grid-cols-[1.1fr,1fr] items-center">
            {/* LEFT – Text */}
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-medium text-emerald-700 tracking-tight dark:bg-emerald-950/40 dark:text-emerald-300">
                {t("section2Pill")}
              </span>

              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-white">
                  {t("section2Title")}
                </h2>

                <p className="text-sm sm:text-base leading-7 text-slate-600 dark:text-slate-300 max-w-xl">
                  {t("section2Description")}
                </p>
              </div>

              <WhatDoWeDo />
            </div>

            {/* RIGHT – Screenshot */}
            <div className="relative">
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-emerald-200/50 via-white to-transparent dark:from-emerald-950/40 dark:via-slate-950 blur-3xl" />

              <div className="rounded-[2rem] border border-white/80 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-black/5 overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <Image
                  src={ScreenshotSiteDiary}
                  alt={t("section2ImageAlt")}
                  priority
                  className="w-full h-auto object-cover"
                />
              </div>

              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
                {t("section2Caption")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 – How we help + why different */}
      <section className="bg-[#f7f8f5] dark:bg-slate-950">
        <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-12 lg:py-20 grid gap-8 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
            <Why />
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
            <HowDoWeDoThat />
          </div>
        </div>
      </section>

      {/* Existing features section
      <Features /> */}
    </>
  );
}
