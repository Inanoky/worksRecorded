"use client";

import {
	LoginLink,
	RegisterLink,
} from "@kinde-oss/kinde-auth-nextjs/components";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Instrument_Serif, Inter, Inter_Tight } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import ScreenshotSiteDiary from "@/public/frontend/pages/Home/ScreenshotSiteDiary.png";
import BisLogo from "@/public/logos/bislogo.png";
import DepromLogo from "@/public/logos/deprom.webp";
import LecLogo from "@/public/logos/lec.png";
import WhatsappLogo from "@/public/logos/WhatsApp_logo.png";
import ZtcLogo from "@/public/logos/ztc.jpg";

const inter = Inter({ subsets: ["latin"], variable: "--font-preview-body" });
const interTight = Inter_Tight({
	subsets: ["latin"],
	variable: "--font-preview-display",
});
const instrumentSerif = Instrument_Serif({
	subsets: ["latin"],
	weight: "400",
	variable: "--font-preview-serif",
});

type TextItem = {
	title: string;
	desc?: string;
};

const clientLogos = [
	{ name: "Deprom", logo: DepromLogo },
	{ name: "LEC", logo: LecLogo },
	{ name: "ZTC", logo: ZtcLogo },
];

export default function ModernLandingPage({
	isPreview = false,
	homePath,
}: {
	isPreview?: boolean;
	homePath?: "Landing" | "Landing_v2" | "LandingPreview";
}) {
	const locale = useLocale();
	const landing = useTranslations("LandingPageDesktop");
	const text = useTranslations("LandingText");
	const auth = useTranslations("AuthButtons");
	const nav = useTranslations("Navigation");
	const calendlyDemoUrl =
		"https://calendly.com/vjaceslavs-worksrecorded/30min?month=2026-05";
	const videoSrc =
		locale === "lv"
			? "https://www.youtube-nocookie.com/embed/i0vXRFjvogA?rel=0&modestbranding=1&playsinline=1"
			: "https://www.youtube-nocookie.com/embed/-CfwJd-hI4I?rel=0&modestbranding=1&playsinline=1";
	const featureItems = text.raw("whatDoWeDo.items") as TextItem[];
	const processItems = text.raw("howDoWeDoThat.items") as TextItem[];
	const whyBullets = text.raw("why.bullets") as string[];
	const resolvedHomePath =
		homePath ?? (isPreview ? "LandingPreview" : "Landing");

	return (
		<main
			className={`${inter.variable} ${interTight.variable} ${instrumentSerif.variable} min-h-screen bg-white text-[#101610]`}
			style={{ fontFamily: "var(--font-preview-body), sans-serif" }}
		>
			<div className="bg-[#072616] px-5 py-2.5 text-center text-xs text-[#cfeede] sm:text-sm">
				{isPreview ? (
					<span className="mr-2 rounded-full bg-[#56eb9f] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#072616]">
						Preview
					</span>
				) : null}
				{landing("topPill")}
			</div>

			<header className="sticky top-0 z-40 border-b border-[#e6ece7] bg-white/90 backdrop-blur-xl">
				<div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-4 sm:px-5 lg:px-8">
					<Link
						href={`/${locale}/${resolvedHomePath}`}
						className="flex items-center gap-3"
					>
						<span
							className="text-xl font-semibold tracking-[-0.04em] text-[#101610] sm:text-2xl"
							style={{ fontFamily: "var(--font-preview-display), sans-serif" }}
						>
							Works<span className="text-[#0a4426]">Recorded</span>
						</span>
						<span className="hidden items-center gap-2 rounded-full border border-[#dbe7de] px-3 py-1.5 text-xs font-medium text-[#66736b] sm:flex">
							<Image
								src={BisLogo}
								alt={landing("bisLogoAlt")}
								className="h-4 w-auto"
							/>
							{landing("bisLogoLabel")}
						</span>
					</Link>

					<nav className="hidden items-center gap-7 text-sm font-medium text-[#354038] lg:flex">
						<Link href={`/${locale}/Landing/SiteDiary`}>{nav("features")}</Link>
						<Link href={`/${locale}/Landing/CaseStudies`}>
							{nav("main.caseStudies")}
						</Link>
						<Link href={`/${locale}/Landing/Pricing`}>
							{nav("main.pricing")}
						</Link>
					</nav>

					<div className="flex items-center gap-1 sm:gap-2">
						<LanguageSwitcher />
						<div className="hidden sm:block">
							<LoginLink>
								<button
									type="button"
									className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-[#354038] transition hover:bg-[#f4f7f4]"
								>
									{auth("signIn")}
								</button>
							</LoginLink>
						</div>
						<RegisterLink>
							<button
								type="button"
								className="inline-flex h-9 items-center rounded-full bg-[#0a4426] px-3 text-xs font-semibold text-white transition hover:bg-[#072616] sm:h-10 sm:px-5 sm:text-sm"
							>
								{auth("signUp")}
							</button>
						</RegisterLink>
					</div>
				</div>
			</header>

			<section className="overflow-hidden px-5 pb-12 pt-14 sm:pt-20 lg:px-8 lg:pb-24">
				<div className="mx-auto max-w-7xl text-center">
					<div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#dbe7de] bg-[#f8faf8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0a4426]">
						<Image
							src={WhatsappLogo}
							alt={landing("whatsappLogoAlt")}
							className="h-4 w-4"
						/>
						{landing("logoStripLabel")} WhatsApp + BIS
					</div>

					<h1
						className="mx-auto mt-8 max-w-5xl text-balance text-[45px] font-semibold leading-[1.08] tracking-[-0.055em] text-[#0a4426] sm:text-6xl lg:text-[76px]"
						style={{ fontFamily: "var(--font-preview-display), sans-serif" }}
					>
						{landing("heroTitle")}
						<span
							className="block font-normal tracking-[-0.025em] text-[#123d24]"
							style={{ fontFamily: "var(--font-preview-serif), serif" }}
						>
							{landing("smallDescription")}
						</span>
					</h1>

					<p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#66736b] sm:text-lg">
						{landing("section2Description")}
					</p>

					<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Link
							href={calendlyDemoUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#0a4426] px-7 text-base font-semibold text-white transition hover:bg-[#072616] sm:w-auto"
						>
							{landing("bookDemo")}
							<ArrowRight className="ml-2 size-4" aria-hidden />
						</Link>
						<RegisterLink>
							<button
								type="button"
								className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[#cfdcd2] bg-white px-7 text-base font-semibold text-[#0a4426] transition hover:border-[#0a4426] hover:bg-[#f4f8f5] sm:w-auto"
							>
								{landing("startFreeTrial")}
							</button>
						</RegisterLink>
					</div>
				</div>

				<div className="mx-auto mt-14 max-w-7xl rounded-[2rem] bg-[#0a2815] p-3 shadow-2xl shadow-[#0a2815]/20 sm:rounded-[2.5rem] sm:p-5">
					<div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-black sm:rounded-[2rem]">
						<div className="relative aspect-video w-full">
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
				</div>
			</section>

			<section className="border-y border-[#e6ece7] bg-[#f8f9f7] px-5 py-12 lg:px-8">
				<div className="mx-auto max-w-6xl text-center">
					<p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#66736b]">
						{landing("clientsHeading")}
					</p>
					<div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
						{clientLogos.map((client) => (
							<div
								key={client.name}
								className="flex h-24 items-center justify-center rounded-[1.5rem] border border-[#e1e8e2] bg-white px-8"
							>
								<Image
									src={client.logo}
									alt={client.name}
									className="max-h-11 w-auto object-contain"
								/>
							</div>
						))}
					</div>
				</div>
			</section>

			<section className="px-5 py-16 lg:px-8 lg:py-24">
				<div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
					<div>
						<p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4426]">
							{landing("section2Pill")}
						</p>
						<h2
							className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.04em] text-[#0a4426] sm:text-5xl"
							style={{ fontFamily: "var(--font-preview-display), sans-serif" }}
						>
							{landing("section2Title")}
						</h2>
						<p className="mt-5 max-w-xl text-base leading-7 text-[#66736b]">
							{landing("section2Description")}
						</p>
						<div className="mt-8 grid gap-3">
							{featureItems.slice(0, 5).map((item) => (
								<FeatureRow key={item.title} title={item.title} />
							))}
						</div>
					</div>

					<div className="rounded-[2rem] border border-[#dfe9e2] bg-[#f8f9f7] p-3 shadow-xl shadow-[#0a2815]/10">
						<Image
							src={ScreenshotSiteDiary}
							alt={landing("section2ImageAlt")}
							priority
							className="rounded-[1.4rem] border border-white object-cover"
						/>
					</div>
				</div>
			</section>

			<section className="bg-[#0a2815] px-5 py-16 text-white lg:px-8 lg:py-24">
				<div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
					<InfoCard
						eyebrow="01"
						title={text("howDoWeDoThat.heading")}
						items={processItems.slice(0, 4)}
					/>
					<InfoCard
						eyebrow="02"
						title={text("why.heading")}
						description={text("why.description")}
						items={whyBullets.map((title) => ({ title }))}
					/>
				</div>
			</section>

			<section className="px-5 py-16 lg:px-8 lg:py-24">
				<div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-[2rem] border border-[#dfe9e2] bg-[#f8f9f7] p-8 sm:p-12 lg:flex-row lg:items-center">
					<div>
						<h2
							className="text-4xl font-semibold tracking-[-0.04em] text-[#0a4426] sm:text-5xl"
							style={{ fontFamily: "var(--font-preview-display), sans-serif" }}
						>
							{landing("bookDemo")}
							<span
								className="block font-normal text-[#123d24]"
								style={{ fontFamily: "var(--font-preview-serif), serif" }}
							>
								{landing("startFreeTrial")}
							</span>
						</h2>
						<p className="mt-4 max-w-xl text-base leading-7 text-[#66736b]">
							{landing("clientsSubheading")}
						</p>
					</div>
					<Link
						href={calendlyDemoUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-[#0a4426] px-7 text-base font-semibold text-white transition hover:bg-[#072616]"
					>
						{landing("bookDemo")}
						<ArrowRight className="ml-2 size-4" aria-hidden />
					</Link>
				</div>
			</section>

			<footer className="border-t border-[#e6ece7] px-5 py-10 text-sm text-[#66736b] lg:px-8">
				<div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<p>WorksRecorded</p>
					<p>Buvconsult SIA, Latvija</p>
				</div>
			</footer>
		</main>
	);
}

function FeatureRow({ title }: { title: string }) {
	return (
		<div className="flex items-start gap-3 rounded-2xl border border-[#dfe9e2] bg-white px-4 py-3 text-[#26322a]">
			<CheckCircle2
				className="mt-0.5 size-5 shrink-0 text-[#0a4426]"
				aria-hidden
			/>
			<p className="leading-6">{title}</p>
		</div>
	);
}

function InfoCard({
	eyebrow,
	title,
	description,
	items,
}: {
	eyebrow: string;
	title: string;
	description?: string;
	items: TextItem[];
}) {
	return (
		<div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 sm:p-9">
			<p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#56eb9f]">
				{eyebrow}
			</p>
			<h3
				className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] text-[#56eb9f] sm:text-4xl"
				style={{ fontFamily: "var(--font-preview-display), sans-serif" }}
			>
				{title}
			</h3>
			{description ? (
				<p className="mt-4 leading-7 text-[#cfeede]">{description}</p>
			) : null}
			<div className="mt-7 grid gap-4">
				{items.map((item) => (
					<div
						key={item.title}
						className="flex items-start gap-3 text-[#effff7]"
					>
						<CheckCircle2
							className="mt-0.5 size-5 shrink-0 text-[#56eb9f]"
							aria-hidden
						/>
						<p className="leading-6">
							<span className="font-semibold">{item.title}</span>
							{item.desc ? (
								<span className="text-[#cfeede]"> — {item.desc}</span>
							) : null}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
