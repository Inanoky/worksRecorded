"use client";

import { IconBrandWhatsapp } from "@tabler/icons-react";
import { ArrowRight, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import ScreenshotSiteDiary from "@/public/frontend/pages/Home/ScreenshotSiteDiary.png";
import { BudgetOutcomeSection } from "../BudgetOutcomeSection";
import { Logos } from "../Logos";
import { HeroProductMockup } from "./HeroProductMockup";
import { HowDoWeDoThat, WhatDoWeDo, Why } from "./Text";

export default function LegacyLandingPage() {
	const t = useTranslations("LandingPageDesktop");
	const locale = useLocale();
	const heroTitle = t("heroTitle");
	const heroTitleAfterWhatsApp = heroTitle.replace(/^WhatsApp\s*/, "");
	const calendlyDemoUrl =
		"https://calendly.com/vjaceslavs-worksrecorded/30min?month=2026-05";
	const videoSrc =
		locale === "lv"
			? "https://www.youtube-nocookie.com/embed/i0vXRFjvogA?rel=0&modestbranding=1&playsinline=1"
			: "https://www.youtube-nocookie.com/embed/-CfwJd-hI4I?rel=0&modestbranding=1&playsinline=1";

	return (
		<>
			<section className="relative overflow-hidden bg-[#f7f8f5] dark:bg-slate-950">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(22,163,74,0.14),transparent_32%),radial-gradient(circle_at_82%_72%,rgba(22,163,74,0.07),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(22,163,74,0.12),transparent_38%)]" />
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-emerald-50/70 to-transparent dark:from-emerald-950/20" />

				<div className="relative mx-auto grid w-full max-w-[1440px] items-center gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[650px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-10 lg:py-12 xl:gap-20 xl:px-14">
					<div className="relative z-10 mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
						<h1 className="text-balance text-4xl font-bold leading-[1.06] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[3.75rem] xl:text-[4.25rem] dark:text-white">
							<span className="inline-flex items-center gap-[0.16em] whitespace-nowrap">
								WhatsApp
								<IconBrandWhatsapp
									className="size-[0.86em] shrink-0 translate-y-[0.05em] text-[#2FC26B]"
									stroke={1.9}
									aria-hidden="true"
								/>
							</span>{" "}
							<span>{heroTitleAfterWhatsApp}</span>
						</h1>

						<p className="mx-auto mt-6 max-w-xl text-balance text-lg font-medium leading-8 text-slate-700 sm:text-xl lg:mx-0 dark:text-slate-200">
							{t("smallDescription")}
						</p>

						<p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg lg:mx-0 dark:text-slate-300">
							{t("heroDescription")}
						</p>

						<div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
							<div className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-3.5 py-2 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
								<span className="font-bold text-[#4285f4]">G</span>
								<span
									className="tracking-[0.08em] text-amber-400"
									aria-hidden="true"
								>
									★★★★★
								</span>
								<span className="font-medium">{t("heroRating")}</span>
							</div>

							<div className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
								<Zap
									className="size-5 fill-emerald-500 text-emerald-500"
									aria-hidden="true"
								/>
								{t("heroSetup")}
							</div>
						</div>

						<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
							<Link
								href={calendlyDemoUrl}
								target="_blank"
								rel="noopener noreferrer"
								data-landing-pressable
								className="inline-flex h-13 w-full items-center justify-center rounded-full bg-[#1769ff] px-8 text-base font-semibold text-white shadow-xl shadow-blue-500/20 transition hover:bg-[#0f5de8] sm:w-auto"
							>
								{t("bookDemo")}
								<ArrowRight className="ml-2 size-4" aria-hidden="true" />
							</Link>

							<Link
								href={`/${locale}/Landing/ContactForm`}
								data-landing-pressable
								className="inline-flex h-13 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-base font-semibold text-slate-950 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
							>
								{t("contactUs")}
							</Link>
						</div>
					</div>

					<div className="relative mx-auto min-h-[340px] w-full max-w-3xl sm:min-h-[470px] lg:min-h-[610px] lg:max-w-none">
						<div className="pointer-events-none absolute inset-x-[12%] bottom-[10%] h-[24%] rounded-full bg-emerald-900/10 blur-3xl dark:bg-emerald-400/10" />
						<HeroProductMockup />
					</div>
				</div>
			</section>

			<section className="relative overflow-hidden bg-[#f7f8f5] dark:bg-slate-950">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(22,163,74,0.08),transparent_35%)]" />

				<div className="relative mx-auto w-full max-w-7xl px-4 pb-10 lg:px-6 lg:pb-14">
					<div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-2xl shadow-slate-900/10 ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900">
						<div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-emerald-200/50 via-white to-transparent blur-3xl dark:from-emerald-950/40 dark:via-slate-950" />

						<div className="relative aspect-video w-full">
							<iframe
								className="absolute inset-0 h-full w-full"
								src={videoSrc}
								title={t("videoTitle")}
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								allowFullScreen
								loading="lazy"
								referrerPolicy="strict-origin-when-cross-origin"
							/>
						</div>
					</div>

					<p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
						{t("videoCaption")}
					</p>
				</div>
			</section>

			<Logos />

			<BudgetOutcomeSection />

			<section className="bg-white dark:bg-slate-950">
				<div className="mx-auto w-full max-w-6xl px-4 py-14 lg:px-6 lg:py-24">
					<div className="grid items-center gap-10 lg:grid-cols-[1.1fr,1fr] lg:gap-14">
						<div className="space-y-6">
							<span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-medium tracking-tight text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
								{t("section2Pill")}
							</span>

							<div className="space-y-4">
								<h2 className="text-3xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
									{t("section2Title")}
								</h2>

								<p className="max-w-xl text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">
									{t("section2Description")}
								</p>
							</div>

							<WhatDoWeDo />
						</div>

						<div className="relative">
							<div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-emerald-200/50 via-white to-transparent blur-3xl dark:from-emerald-950/40 dark:via-slate-950" />

							<div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900">
								<Image
									src={ScreenshotSiteDiary}
									alt={t("section2ImageAlt")}
									priority
									className="h-auto w-full object-cover"
								/>
							</div>

							<p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
								{t("section2Caption")}
							</p>
						</div>
					</div>
				</div>
			</section>

			<section className="bg-[#f7f8f5] dark:bg-slate-950">
				<div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 lg:grid-cols-2 lg:px-6 lg:py-20">
					<div className="rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
						<Why />
					</div>

					<div className="rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
						<HowDoWeDoThat />
					</div>
				</div>
			</section>
		</>
	);
}
