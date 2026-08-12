import type { Metadata } from "next";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
	CheckList,
	MarketingPageShell,
	MediaFrame,
	PageEyebrow,
	PrimaryCta,
} from "@/components/landing/MarketingPagePrimitives";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";
import AnalyticsOverview from "@/public/frontend/pages/Analytics/Analytics1.png";
import AnalyticsDetails from "@/public/frontend/pages/Analytics/Analytics2.png";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale } = await params;
	return buildLandingMetadata({
		locale,
		path: "/Landing/Analytics",
		title: "Construction Analytics Software | WorksRecorded",
		description:
			"Track project progress, productivity, and KPIs with AI-powered construction analytics dashboards.",
		keywords: [
			"construction analytics",
			"project analytics",
			"construction software",
			"WorksRecorded",
		],
	});
}

export default function Page() {
	const t = useTranslations("Analytics");
	const landing = useTranslations("LandingPageDesktop");
	const locale = useLocale();
	const benefits = [
		t("block2.li1"),
		t("block2.li2"),
		t("block2.li3"),
		t("block2.li4"),
	];

	return (
		<MarketingPageShell>
			<section className="mx-auto grid min-h-[720px] w-full max-w-[1440px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-10 lg:py-20 xl:px-14">
				<div className="max-w-xl">
					<PageEyebrow>WorksRecorded</PageEyebrow>
					<h1 className="mt-5 text-balance text-5xl font-bold leading-[1.03] tracking-[-0.04em] sm:text-6xl lg:text-[4.6rem]">
						{t("title")}
					</h1>
					<h2 className="mt-7 text-2xl font-semibold tracking-tight text-[#087a49]">
						{t("block1.title")}
					</h2>
					<p className="mt-4 text-lg leading-8 text-slate-600 sm:text-xl dark:text-slate-300">
						{t("block1.text")}
					</p>
					<div className="mt-8">
						<PrimaryCta href={`/${locale}/Landing/ContactForm`}>
							{landing("contactUs")}
						</PrimaryCta>
					</div>
				</div>
				<MediaFrame>
					<Image
						src={AnalyticsOverview}
						alt={t("images.overviewAlt")}
						priority
						quality={100}
						className="h-auto w-full"
						sizes="(min-width: 1024px) 62vw, 92vw"
					/>
				</MediaFrame>
			</section>

			<section className="mx-auto w-full max-w-[1328px] px-5 pb-20 sm:px-8 lg:px-10 lg:pb-28">
				<div className="grid items-center gap-12 border-y border-slate-200/80 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-24 dark:border-slate-800">
					<div>
						<PageEyebrow>{t("block2.title")}</PageEyebrow>
						<h2 className="mt-5 text-balance text-4xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
							{t("block2.title")}
						</h2>
						<CheckList items={benefits} />
					</div>
					<MediaFrame>
						<Image
							src={AnalyticsDetails}
							alt={t("images.detailsAlt")}
							quality={100}
							className="h-auto w-full"
						/>
					</MediaFrame>
				</div>
			</section>
		</MarketingPageShell>
	);
}
