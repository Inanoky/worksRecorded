import {
	ArrowRight,
	BadgeCheck,
	BarChart3,
	Boxes,
	Calculator,
	Camera,
	Check,
	CircleDollarSign,
	Factory,
	FileSpreadsheet,
	Handshake,
	type LucideIcon,
	MessageCircleMore,
	Mic2,
	PackageCheck,
	ScanLine,
	TriangleAlert,
	Workflow,
	X,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { buildLandingMetadata } from "@/lib/seo/landingMetadata";

type PageProps = {
	params: Promise<{ locale: string }>;
};

type Feature = {
	title: string;
	description: string;
};

type VisualLabels = {
	worker: string;
	whatsapp: string;
	productionRecord: string;
	project: string;
	element: string;
	workType: string;
	planned: string;
	additional: string;
	unexpected: string;
	voiceMessage: string;
	structuredData: string;
	qaCheck: string;
	approved: string;
	labour: string;
	actualCost: string;
	factoryVisit: string;
	workflowSetup: string;
	teamTraining: string;
};

const FEATURE_ICONS: LucideIcon[] = [
	MessageCircleMore,
	ScanLine,
	TriangleAlert,
	Mic2,
	BadgeCheck,
	Calculator,
	Handshake,
];

const VOICE_WAVEFORM = [
	{ id: "wave-01", height: 12 },
	{ id: "wave-02", height: 22 },
	{ id: "wave-03", height: 16 },
	{ id: "wave-04", height: 28 },
	{ id: "wave-05", height: 20 },
	{ id: "wave-06", height: 34 },
	{ id: "wave-07", height: 18 },
	{ id: "wave-08", height: 26 },
	{ id: "wave-09", height: 14 },
	{ id: "wave-10", height: 30 },
	{ id: "wave-11", height: 19 },
	{ id: "wave-12", height: 24 },
];

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale } = await params;

	return buildLandingMetadata({
		locale,
		path: "/Landing/Manufacturing",
		title: "Manufacturing Production Journal | WorksRecorded",
		description:
			"Capture factory work through WhatsApp, calculate operation costs, and compare estimates with actual production data.",
		keywords: [
			"manufacturing software",
			"production journal",
			"manufacturing productivity",
			"WhatsApp work tracking",
			"WorksRecorded",
		],
	});
}

export default function Page() {
	const t = useTranslations("Manufacturing");
	const locale = useLocale();
	const features = t.raw("features") as Feature[];
	const withoutItems = t.raw("comparison.withoutItems") as string[];
	const withItems = t.raw("comparison.withItems") as string[];
	const visualLabels = t.raw("visual") as VisualLabels;
	const comparisonRows = Array.from({
		length: Math.max(withoutItems.length, withItems.length),
	});

	return (
		<main className="overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(8,122,73,0.12),transparent_18%),radial-gradient(circle_at_88%_42%,rgba(23,105,255,0.055),transparent_22%),linear-gradient(180deg,#f7f8f5_0%,#ffffff_46%,#f7f8f5_100%)] text-slate-950 dark:bg-slate-950 dark:text-white">
			<section className="relative mx-auto grid min-h-[720px] w-full max-w-[1440px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:px-10 lg:py-20 xl:px-14">
				<div className="relative z-10 max-w-2xl">
					<p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#087a49]">
						<span className="h-0.5 w-8 rounded-full bg-[#087a49]" />
						WorksRecorded
					</p>
					<h1 className="mt-5 text-balance text-5xl font-bold leading-[1.03] tracking-[-0.04em] sm:text-6xl lg:text-[4.75rem]">
						{t("hero.titlePrefix")}{" "}
						<span className="text-[#087a49]">{t("hero.titleHighlight")}</span>
					</h1>
					<p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl dark:text-slate-300">
						{t("hero.description")}
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Link
							href={`/${locale}/Landing/ContactForm`}
							data-landing-pressable
							className="inline-flex h-13 items-center justify-center rounded-full bg-[#1769ff] px-8 text-base font-semibold text-white shadow-xl shadow-blue-500/20 transition hover:bg-[#0f5de8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#087a49]"
						>
							{t("hero.cta")}
							<ArrowRight className="ml-2 size-4" aria-hidden="true" />
						</Link>
					</div>
				</div>

				<div className="relative aspect-[1678/941]">
					<div className="absolute inset-0 overflow-hidden rounded-[2rem] shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
						<Image
							src="/frontend/pages/Manufacturing/factory-hero.png"
							alt={t("hero.photoAlt")}
							fill
							priority
							quality={100}
							className="object-cover object-center"
							sizes="(min-width: 1280px) 760px, (min-width: 1024px) 58vw, 92vw"
						/>
					</div>

					<div className="absolute -bottom-5 left-5 max-w-[19rem] rounded-2xl bg-[#033b27] px-5 py-4 text-white shadow-[0_18px_45px_rgba(3,59,39,0.28)] sm:left-8 lg:-left-7 lg:bottom-8">
						<p className="text-sm font-semibold leading-6">
							{t("hero.caption")}
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
							Icon={FEATURE_ICONS[index]}
							labels={visualLabels}
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
							{t("comparison.titlePrefix")}{" "}
							<span className="text-[#087a49]">
								{t("comparison.titleHighlight")}
							</span>
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
								{comparisonRows.map((_, index) => (
									<tr
										key={withoutItems[index] ?? withItems[index]}
										className="border-t border-slate-200 dark:border-slate-800"
									>
										<td className="border-r border-slate-200 px-8 py-5 align-top dark:border-slate-800">
											{withoutItems[index] ? (
												<ComparisonItem
													icon="negative"
													text={withoutItems[index]}
												/>
											) : (
												<span className="text-slate-300" aria-hidden="true">
													—
												</span>
											)}
										</td>
										<td className="px-8 py-5 align-top">
											{withItems[index] ? (
												<ComparisonItem
													icon="positive"
													text={withItems[index]}
												/>
											) : (
												<span className="text-slate-300" aria-hidden="true">
													—
												</span>
											)}
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
	Icon,
	labels,
}: {
	feature: Feature;
	index: number;
	Icon: LucideIcon;
	labels: VisualLabels;
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
				<div className="relative mx-auto aspect-[4/3] w-full max-w-[590px] overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
					<ManufacturingVisual index={index} labels={labels} />
					<span className="absolute right-6 top-6 grid size-14 place-items-center rounded-2xl bg-[#087a49] text-white shadow-xl shadow-emerald-950/20">
						<Icon className="size-7" strokeWidth={1.8} aria-hidden="true" />
					</span>
				</div>
			</div>
		</article>
	);
}

function ManufacturingVisual({
	index,
	labels,
}: {
	index: number;
	labels: VisualLabels;
}) {
	const visuals = [
		<ChannelFlow key="channel" labels={labels} />,
		<DrawingExtraction key="drawing" labels={labels} />,
		<WorkClassification key="classification" labels={labels} />,
		<VoiceFlow key="voice" labels={labels} />,
		<QualityFlow key="quality" labels={labels} />,
		<CostFlow key="cost" labels={labels} />,
		<IntegrationFlow key="integration" labels={labels} />,
	];

	return (
		<div className="h-full bg-[linear-gradient(145deg,#f8fbf9_0%,#eef7f2_100%)] p-7 sm:p-10">
			{visuals[index]}
		</div>
	);
}

function ChannelFlow({ labels }: { labels: VisualLabels }) {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="grid w-full grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 sm:gap-4">
				<DiagramNode icon={Factory} label={labels.worker} />
				<ArrowRight className="size-5 text-[#7aa18e]" />
				<DiagramNode icon={MessageCircleMore} label={labels.whatsapp} accent />
				<ArrowRight className="size-5 text-[#7aa18e]" />
				<DiagramNode icon={BarChart3} label={labels.productionRecord} />
			</div>
		</div>
	);
}

function DrawingExtraction({ labels }: { labels: VisualLabels }) {
	return (
		<div className="flex h-full items-center gap-5">
			<div className="relative flex h-[78%] w-[46%] items-center justify-center rounded-2xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
				<FileSpreadsheet className="size-20 text-[#087a49]" strokeWidth={1.4} />
				<span className="absolute inset-x-5 bottom-5 h-1 rounded-full bg-[#2fc26b]" />
			</div>
			<ArrowRight className="size-6 shrink-0 text-[#7aa18e]" />
			<div className="grid flex-1 gap-3">
				{[labels.project, labels.element, labels.workType].map(
					(label, itemIndex) => (
						<div
							key={label}
							className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200"
						>
							<span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-[#087a49]">
								{itemIndex + 1}
							</span>
							<span className="text-sm font-semibold text-slate-700 sm:text-base">
								{label}
							</span>
						</div>
					),
				)}
			</div>
		</div>
	);
}

function WorkClassification({ labels }: { labels: VisualLabels }) {
	const items = [
		{ label: labels.planned, Icon: Boxes, tone: "bg-slate-900 text-white" },
		{
			label: labels.additional,
			Icon: PackageCheck,
			tone: "bg-[#087a49] text-white",
		},
		{
			label: labels.unexpected,
			Icon: TriangleAlert,
			tone: "bg-amber-400 text-slate-950",
		},
	];

	return (
		<div className="flex h-full items-center justify-center">
			<div className="grid w-full gap-4">
				{items.map(({ label, Icon, tone }) => (
					<div
						key={label}
						className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
					>
						<span
							className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}
						>
							<Icon className="size-5" />
						</span>
						<span className="font-semibold text-slate-800">{label}</span>
						<Check className="ml-auto size-5 text-[#087a49]" />
					</div>
				))}
			</div>
		</div>
	);
}

function VoiceFlow({ labels }: { labels: VisualLabels }) {
	return (
		<div className="flex h-full flex-col justify-center gap-6">
			<div className="flex items-center gap-4 rounded-2xl bg-[#e8fff1] p-5 ring-1 ring-[#b6eccb]">
				<span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#2fc26b] text-white">
					<Mic2 className="size-6" />
				</span>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-semibold text-[#087a49]">
						{labels.voiceMessage}
					</p>
					<div className="mt-3 flex h-8 items-center gap-1">
						{VOICE_WAVEFORM.map(({ id, height }) => (
							<span
								key={id}
								className="w-1 rounded-full bg-[#2fc26b]"
								style={{ height }}
							/>
						))}
					</div>
				</div>
			</div>
			<div className="flex justify-center">
				<ArrowRight className="size-6 rotate-90 text-[#7aa18e]" />
			</div>
			<div className="grid grid-cols-3 gap-3">
				{[labels.project, labels.workType, labels.structuredData].map(
					(label) => (
						<div
							key={label}
							className="rounded-xl bg-white p-3 text-center text-xs font-semibold text-slate-700 ring-1 ring-slate-200 sm:text-sm"
						>
							{label}
						</div>
					),
				)}
			</div>
		</div>
	);
}

function QualityFlow({ labels }: { labels: VisualLabels }) {
	return (
		<div className="grid h-full grid-cols-[0.9fr_1.1fr] items-center gap-5">
			<div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#dceee5] ring-1 ring-[#bdd7c8]">
				<div className="absolute inset-x-5 top-7 h-2 rounded-full bg-[#8ebaa2]" />
				<div className="absolute inset-x-5 top-14 grid grid-cols-3 gap-2">
					{[0, 1, 2, 3, 4, 5].map((item) => (
						<span
							key={item}
							className="aspect-square rounded-lg bg-white/80 ring-1 ring-white"
						/>
					))}
				</div>
				<Camera className="absolute bottom-6 left-1/2 size-12 -translate-x-1/2 text-[#087a49]" />
			</div>
			<div className="grid gap-4">
				<p className="text-sm font-bold uppercase tracking-[0.14em] text-[#087a49]">
					{labels.qaCheck}
				</p>
				{[labels.project, labels.element, labels.workType].map((label) => (
					<div
						key={label}
						className="flex items-center gap-3 border-b border-slate-200 pb-3 text-sm font-semibold text-slate-700 sm:text-base"
					>
						<Check className="size-5 shrink-0 text-[#087a49]" />
						{label}
					</div>
				))}
				<div className="mt-1 flex items-center gap-2 rounded-xl bg-[#087a49] px-4 py-3 font-semibold text-white">
					<BadgeCheck className="size-5" />
					{labels.approved}
				</div>
			</div>
		</div>
	);
}

function CostFlow({ labels }: { labels: VisualLabels }) {
	return (
		<div className="flex h-full flex-col justify-center gap-5">
			<div className="grid grid-cols-3 gap-3">
				{["m²", "kg", "t"].map((unit) => (
					<div
						key={unit}
						className="rounded-2xl bg-white px-4 py-5 text-center text-2xl font-bold text-[#087a49] ring-1 ring-slate-200"
					>
						{unit}
					</div>
				))}
			</div>
			<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
				<div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
					<CircleDollarSign className="size-7 text-[#087a49]" />
					<p className="mt-3 text-sm font-semibold text-slate-700">
						{labels.labour}
					</p>
				</div>
				<ArrowRight className="size-5 text-[#7aa18e]" />
				<div className="rounded-2xl bg-[#087a49] p-4 text-white">
					<Calculator className="size-7" />
					<p className="mt-3 text-sm font-semibold">{labels.actualCost}</p>
				</div>
			</div>
		</div>
	);
}

function IntegrationFlow({ labels }: { labels: VisualLabels }) {
	const steps = [
		{ label: labels.factoryVisit, Icon: Factory },
		{ label: labels.workflowSetup, Icon: Workflow },
		{ label: labels.teamTraining, Icon: Handshake },
	];

	return (
		<div className="flex h-full items-center justify-center">
			<div className="grid w-full gap-3">
				{steps.map(({ label, Icon }, index) => (
					<div
						key={label}
						className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
					>
						<span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-[#087a49]">
							<Icon className="size-5" />
						</span>
						<span className="font-semibold text-slate-800">{label}</span>
						<span className="text-sm font-bold text-[#087a49]">
							0{index + 1}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function DiagramNode({
	icon: Icon,
	label,
	accent = false,
}: {
	icon: LucideIcon;
	label: string;
	accent?: boolean;
}) {
	return (
		<div
			className={`flex min-h-32 flex-col items-center justify-center rounded-2xl p-3 text-center ring-1 ${accent ? "bg-[#087a49] text-white ring-[#087a49]" : "bg-white text-slate-800 ring-slate-200"}`}
		>
			<Icon className="size-8" strokeWidth={1.7} />
			<span className="mt-3 text-xs font-semibold sm:text-sm">{label}</span>
		</div>
	);
}

function ComparisonItem({
	icon,
	text,
}: {
	icon: "positive" | "negative";
	text: string;
}) {
	const positive = icon === "positive";
	return (
		<div className="flex items-start gap-3 text-base font-medium leading-7 text-slate-800 dark:text-slate-200">
			<span
				className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${positive ? "bg-emerald-100 text-[#087a49]" : "bg-red-100 text-[#b94040]"}`}
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
			<h3
				className={`text-xl font-bold ${positive ? "text-[#087a49]" : "text-[#b94040]"}`}
			>
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
