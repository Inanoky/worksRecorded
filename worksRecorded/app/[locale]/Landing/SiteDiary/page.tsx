import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
	ArrowRight,
	BrainCircuit,
	ChartNoAxesCombined,
	Check,
	FileSpreadsheet,
	LayoutDashboard,
	MessageCircleMore,
	Mic2,
	ReceiptText,
	Sparkles,
	X,
	type LucideIcon,
} from "lucide-react";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";

type PageProps = {
	params: Promise<{ locale: string }>;
};

type Feature = {
	title: string;
	description: string;
};

const FEATURE_IMAGES = [
	"no-new-software-hd",
	"voice-messages-hd",
	"no-onboarding-hd",
	"no-data-entry-hd",
	"project-visibility-hd",
	"estimate-import-hd",
	"invoice-materials-hd",
	"ai-analysis-hd",
];

const FEATURE_ICONS: LucideIcon[] = [
	MessageCircleMore,
	Mic2,
	Sparkles,
	BrainCircuit,
	LayoutDashboard,
	FileSpreadsheet,
	ReceiptText,
	ChartNoAxesCombined,
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { locale } = await params;

	return buildLandingMetadata({
		locale,
		path: "/Landing/SiteDiary",
		title: "Construction Site Diary for Contractors | WorksRecorded",
		description:
			"Capture site updates through WhatsApp, automate construction documentation, and compare estimates with actual project costs.",
		keywords: [
			"construction site diary",
			"construction cost tracking",
			"WhatsApp construction reporting",
			"AI construction software",
			"WorksRecorded",
		],
	});
}

export default function Page() {
	const t = useTranslations("SiteDiary");
	const locale = useLocale();
	const features = t.raw("features") as Feature[];
	const withoutItems = t.raw("comparison.withoutItems") as string[];
	const withItems = t.raw("comparison.withItems") as string[];

	return (
		<main className="overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(8,122,73,0.12),transparent_18%),radial-gradient(circle_at_88%_42%,rgba(23,105,255,0.055),transparent_22%),linear-gradient(180deg,#f7f8f5_0%,#ffffff_46%,#f7f8f5_100%)] text-slate-950 dark:bg-slate-950 dark:text-white">
			<section className="relative mx-auto grid min-h-[720px] w-full max-w-[1440px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:px-10 lg:py-20 xl:px-14">
				<div className="relative z-10 max-w-2xl">
					<p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#087a49]">
						<span className="h-0.5 w-8 rounded-full bg-[#087a49]" />
						WorksRecorded
					</p>
					<h1 className="mt-5 text-balance text-5xl font-bold leading-[1.03] tracking-[-0.045em] sm:text-6xl lg:text-[4.75rem]">
						{t("hero.titlePrefix")} {" "}
						<span className="text-[#087a49]">{t("hero.titleHighlight")}</span>
					</h1>
					<p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl dark:text-slate-300">
						{t("hero.description")}
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Link
							href={`/${locale}/Landing/ContactForm`}
							data-landing-pressable
							className="inline-flex h-13 items-center justify-center rounded-full bg-[#1769ff] px-8 text-base font-semibold text-white shadow-xl shadow-blue-500/20 transition hover:bg-[#0f5de8]"
						>
							{t("hero.cta")}
							<ArrowRight className="ml-2 size-4" aria-hidden="true" />
						</Link>
					</div>
				</div>

				<div className="relative min-h-[390px] sm:min-h-[520px] lg:min-h-[610px]">
					<div className="absolute inset-0 overflow-hidden rounded-[2rem] shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
						<Image
							src="/frontend/pages/SiteDiary/hero-construction-site-scott-blake.jpg"
							alt={t("hero.photoAlt")}
							fill
							priority
							quality={100}
							className="object-cover object-[58%_center]"
							sizes="(min-width: 1280px) 760px, (min-width: 1024px) 58vw, 92vw"
						/>
					</div>

					<div className="absolute -bottom-5 left-5 max-w-[19rem] rounded-2xl bg-[#033b27] px-5 py-4 text-white shadow-[0_18px_45px_rgba(3,59,39,0.28)] sm:left-8 lg:-left-7 lg:bottom-8">
						<p className="text-sm font-semibold leading-6">
							{t("hero.photoCaption")}
						</p>
					</div>
				</div>
			</section>

			<section className="mx-auto w-full max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-10 lg:pb-24 xl:px-14">
				<div className="border-y border-slate-200/80 dark:border-slate-800">
					{features.map((feature, index) => (
						<FeatureSection
							key={feature.title}
							feature={feature}
							index={index}
							imageName={FEATURE_IMAGES[index]}
							Icon={FEATURE_ICONS[index]}
						/>
					))}
				</div>
			</section>

			<section className="relative px-5 py-16 sm:px-8 lg:px-10 lg:py-24 xl:px-14">
				<div className="mx-auto w-full max-w-[1328px]">
					<div className="max-w-4xl">
						<p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#087a49]">
							<span className="h-0.5 w-8 rounded-full bg-[#087a49]" />
							{t("comparison.eyebrow")}
						</p>
						<h2 className="mt-5 text-balance text-4xl font-bold leading-[1.06] tracking-[-0.04em] sm:text-5xl lg:text-[4.25rem]">
							{t("comparison.titlePrefix")} {" "}
							<span className="text-[#087a49]">{t("comparison.titleHighlight")}</span>
						</h2>
						<p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
							{t("comparison.description")}
						</p>
					</div>

					<div className="mt-12 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900">
						<table className="hidden w-full table-fixed border-collapse lg:table">
							<thead>
								<tr>
									<th className="border-r border-slate-200 bg-red-50 px-8 py-6 text-left text-xl font-bold text-[#b94040] dark:border-slate-800 dark:bg-red-950/20">
										{t("comparison.withoutTitle")}
									</th>
									<th className="bg-emerald-50 px-8 py-6 text-left text-xl font-bold text-[#087a49] dark:bg-emerald-950/20">
										{t("comparison.withTitle")}
									</th>
								</tr>
							</thead>
							<tbody>
								{withoutItems.map((withoutItem, index) => (
									<tr key={withoutItem} className="border-t border-slate-200 dark:border-slate-800">
										<td className="border-r border-slate-200 px-8 py-5 align-top dark:border-slate-800">
											<ComparisonItem icon="negative" text={withoutItem} />
										</td>
										<td className="px-8 py-5 align-top">
											<ComparisonItem icon="positive" text={withItems[index]} />
										</td>
									</tr>
								))}
							</tbody>
						</table>

						<div className="grid lg:hidden">
							<ComparisonList
								title={t("comparison.withoutTitle")}
								items={withoutItems}
								tone="negative"
							/>
							<ComparisonList
								title={t("comparison.withTitle")}
								items={withItems}
								tone="positive"
							/>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}

function FeatureSection({
	feature,
	index,
	imageName,
	Icon,
}: {
	feature: Feature;
	index: number;
	imageName: string;
	Icon: LucideIcon;
}) {
	const reverse = index % 2 === 1;

	return (
		<article className="grid min-h-[560px] items-center gap-10 border-b border-slate-200/80 py-14 last:border-b-0 lg:grid-cols-2 lg:gap-20 lg:py-16 dark:border-slate-800">
			<div className={reverse ? "lg:order-2" : ""}>
				<p className="text-sm font-bold uppercase tracking-[0.16em] text-[#087a49]">
					{String(index + 1).padStart(2, "0")}
				</p>
				<h2 className="mt-4 max-w-xl text-balance text-4xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
					{feature.title}
				</h2>
				<p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl dark:text-slate-300">
					{feature.description}
				</p>
			</div>

			<div className={reverse ? "lg:order-1" : ""}>
				<div className="relative mx-auto aspect-[4/3] w-full max-w-[590px] overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80 dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800">
					<Image
						src={`/frontend/pages/SiteDiary/features/${imageName}.png`}
						alt=""
						fill
						quality={90}
						className="object-cover"
						sizes="(min-width: 1024px) 45vw, 92vw"
					/>
					<span className="absolute right-6 top-6 grid size-14 place-items-center rounded-2xl bg-[#087a49] text-white shadow-xl shadow-emerald-950/20">
						<Icon className="size-7" strokeWidth={1.8} aria-hidden="true" />
					</span>
				</div>
			</div>
		</article>
	);
}

function ComparisonItem({ icon, text }: { icon: "positive" | "negative"; text: string }) {
	const positive = icon === "positive";
	return (
		<div className="flex items-start gap-3 text-base font-medium leading-7 text-slate-800 dark:text-slate-200">
			<span
				className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${
					positive ? "bg-emerald-100 text-[#087a49]" : "bg-red-100 text-[#b94040]"
				}`}
			>
				{positive ? <Check className="size-4" /> : <X className="size-4" />}
			</span>
			<span>{text}</span>
		</div>
	);
}

function ComparisonList({
	title,
	items,
	tone,
}: {
	title: string;
	items: string[];
	tone: "positive" | "negative";
}) {
	const positive = tone === "positive";
	return (
		<div className="border-b border-slate-200 p-6 last:border-b-0 sm:p-8 dark:border-slate-800">
			<h3 className={`text-xl font-bold ${positive ? "text-[#087a49]" : "text-[#b94040]"}`}>
				{title}
			</h3>
			<ul className="mt-6 grid gap-5">
				{items.map((item) => (
					<li key={item}>
						<ComparisonItem icon={tone} text={item} />
					</li>
				))}
			</ul>
		</div>
	);
}
