"use client";

import { IconBrandWhatsapp } from "@tabler/icons-react";
import {
	ArrowRight,
	BarChart3,
	Calculator,
	Camera,
	CircleDollarSign,
	Lightbulb,
	Mic2,
	ReceiptText,
	Telescope,
	TrendingUp,
	TriangleAlert,
	Zap,
	type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import HowItWorksDiagram from "@/public/frontend/pages/Home/HowItWorksDiagram.png";
import { BudgetOutcomeSection } from "../BudgetOutcomeSection";
import { Logos } from "../Logos";
import { HeroProductMockup } from "./HeroProductMockup";
import { WhyWorksRecordedSection } from "./WhyWorksRecordedSection";

const workflowInputIcons = [
	Mic2,
	Camera,
	ReceiptText,
	TriangleAlert,
	TrendingUp,
];

const workflowOutputIcons = [
	BarChart3,
	CircleDollarSign,
	Lightbulb,
	Telescope,
	Calculator,
];

export default function LegacyLandingPage() {
	const t = useTranslations("LandingPageDesktop");
	const locale = useLocale();
	const heroTitle = t("heroTitle");
	const workflowInputs = t.raw("workflowDiagram.inputs") as string[];
	const workflowOutputs = t.raw("workflowDiagram.outputs") as string[];
	const heroTitleAfterWhatsApp = heroTitle.replace(/^WhatsApp\s*/, "");
	const calendlyDemoUrl =
		"https://calendly.com/vjaceslavs-worksrecorded/30min?month=2026-05";
	const videoSrc =
		locale === "lv"
			? "https://www.youtube-nocookie.com/embed/i0vXRFjvogA?rel=0&modestbranding=1&playsinline=1"
			: "https://www.youtube-nocookie.com/embed/-CfwJd-hI4I?rel=0&modestbranding=1&playsinline=1";

	return (
		<main className="relative overflow-hidden bg-[radial-gradient(circle_at_10%_8%,rgba(8,122,73,0.12),transparent_18%),radial-gradient(circle_at_92%_32%,rgba(23,105,255,0.055),transparent_18%),radial-gradient(circle_at_8%_62%,rgba(8,122,73,0.08),transparent_17%),radial-gradient(circle_at_92%_86%,rgba(8,122,73,0.06),transparent_16%),linear-gradient(180deg,#f7f8f5_0%,#ffffff_48%,#f7f8f5_100%)] text-slate-950 dark:bg-slate-950 dark:text-white">
			<section className="relative overflow-hidden">

				<div className="relative mx-auto grid w-full max-w-[1440px] items-center gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[650px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-10 lg:py-12 xl:gap-20 xl:px-14">
					<div className="relative z-10 mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
						<h1 className="text-balance text-4xl font-bold leading-[1.06] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[3.75rem] xl:text-[4.25rem] dark:text-white">
							<span className="inline-flex items-center gap-[0.16em] whitespace-nowrap">
								WhatsApp
								<IconBrandWhatsapp
									className="size-[0.86em] shrink-0 translate-y-[0.05em] text-[#087a49]"
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
									className="size-5 fill-[#087a49] text-[#087a49]"
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

			<Logos />

			<section className="relative overflow-hidden">
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

			<BudgetOutcomeSection />

			<section className="relative overflow-hidden">
				<div className="relative mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24 xl:px-14">
					<div className="max-w-3xl">
						<h2 className="text-balance text-4xl font-bold leading-[1.06] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[3.75rem] xl:text-[4.25rem] dark:text-white">
							{t("workflowDiagram.titlePrefix")} {" "}
							<span className="text-[#087a49] dark:text-emerald-400">
								{t("workflowDiagram.titleHighlight")}
							</span>
						</h2>
						<p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
							{t("workflowDiagram.description")}
						</p>
					</div>

					<div className="mt-10 hidden overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 lg:block dark:border-slate-800 dark:bg-slate-900">
						<div className="relative aspect-[2.62] overflow-hidden bg-white">
							<Image
								src={HowItWorksDiagram}
								alt={t("workflowDiagram.imageAlt")}
								className="h-auto w-full"
								sizes="(min-width: 1440px) 1328px, 92vw"
							/>
						</div>

						<div className="grid grid-cols-2 border-t border-slate-200/80">
							<div className="bg-white px-10 py-8">
								<WorkflowRail
									heading={t("workflowDiagram.inputHeading")}
									items={workflowInputs}
									icons={workflowInputIcons}
									tone="input"
									compact
								/>
							</div>

							<div className="relative border-l border-blue-200/70 bg-[#eef6ff] px-10 py-8">
								<span className="absolute left-0 top-9 grid size-11 -translate-x-1/2 place-items-center rounded-full bg-[#1769ff] text-white shadow-lg shadow-blue-500/20">
									<ArrowRight className="size-5" aria-hidden="true" />
								</span>
								<WorkflowRail
									heading={t("workflowDiagram.outputHeading")}
									items={workflowOutputs}
									icons={workflowOutputIcons}
									tone="output"
									compact
								/>
							</div>
						</div>
					</div>

					<div className="mt-10 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10 lg:hidden dark:border-slate-800 dark:bg-slate-900">
						<div className="bg-white">
							<div className="relative aspect-[1.32] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
								<Image
									src={HowItWorksDiagram}
									alt={t("workflowDiagram.imageAlt")}
									className="absolute left-0 top-0 h-auto w-[200%] max-w-none"
									sizes="(max-width: 1023px) 200vw, 1px"
								/>
							</div>
							<div className="px-5 py-6 sm:px-7">
								<WorkflowRail
									heading={t("workflowDiagram.inputHeading")}
									items={workflowInputs}
									icons={workflowInputIcons}
									tone="input"
								/>
							</div>
						</div>

						<div className="relative border-t border-blue-200/70 bg-[#eef6ff]">
							<span className="absolute left-1/2 top-0 z-10 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#1769ff] text-white shadow-lg shadow-blue-500/20">
								<ArrowRight className="size-5 rotate-90" aria-hidden="true" />
							</span>
							<div className="relative aspect-[1.32] overflow-hidden bg-[#eef6ff]">
								<Image
									src={HowItWorksDiagram}
									alt=""
									aria-hidden="true"
									className="absolute right-0 top-0 h-auto w-[200%] max-w-none"
									sizes="(max-width: 1023px) 200vw, 1px"
								/>
							</div>
							<div className="px-5 py-6 sm:px-7">
								<WorkflowRail
									heading={t("workflowDiagram.outputHeading")}
									items={workflowOutputs}
									icons={workflowOutputIcons}
									tone="output"
								/>
							</div>
						</div>
					</div>
				</div>
			</section>

			<WhyWorksRecordedSection />
		</main>
	);
}

function WorkflowRail({
	heading,
	items,
	icons,
	tone,
	compact = false,
}: {
	heading: string;
	items: string[];
	icons: LucideIcon[];
	tone: "input" | "output";
	compact?: boolean;
}) {
	const isOutput = tone === "output";

	return (
		<div>
			<h3
				className={`font-semibold tracking-[-0.02em] ${
					compact ? "text-lg" : "text-xl"
				} ${isOutput ? "text-blue-900" : "text-[#087a49]"}`}
			>
				{heading}
			</h3>
			<ul
				className={
					compact
						? "mt-4 grid grid-cols-2 gap-x-8"
						: `mt-3 divide-y ${isOutput ? "divide-blue-200/80" : "divide-emerald-200/80"}`
				}
			>
				{items.map((item, index) => {
					const Icon = icons[index];

					return (
						<li
							key={item}
							className={`flex items-center gap-3 ${
								compact
									? `border-b py-3 ${isOutput ? "border-blue-200/80" : "border-emerald-200/80"}`
									: "py-3"
							}`}
						>
							<span
								className={`grid shrink-0 place-items-center rounded-full ${
									compact ? "size-7" : "size-9"
								} ${
									isOutput
										? "bg-blue-100 text-blue-700"
										: "bg-[#e5f5ed] text-[#087a49]"
								}`}
							>
								<Icon className={compact ? "size-3.5" : "size-4"} aria-hidden="true" />
							</span>
							<span className={`${compact ? "text-[1.1rem]" : "text-xl"} font-medium leading-6 text-slate-800`}>
								{item}
							</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
