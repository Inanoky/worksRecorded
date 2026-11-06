import type { Metadata } from "next";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
	MarketingPageShell,
	MediaFrame,
	PageEyebrow,
	PrimaryCta,
} from "@/components/landing/MarketingPagePrimitives";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";
import Development from "@/public/frontend/pages/CustomSolutions/Development.png";
import Site from "@/public/frontend/pages/CustomSolutions/Site.jpeg";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale } = await params;
	return buildLandingMetadata({
		locale,
		path: "/Landing/Custom",
		title: "Custom Construction AI Solutions | WorksRecorded",
		description:
			"Build custom AI workflows for your construction business, from reporting automation to project-specific tools.",
		keywords: [
			"construction software",
			"AI tools",
			"AI in construction",
			"construction technology",
			"WorksRecorded",
		],
	});
}

export default function Page() {
	const t = useTranslations("CustomSolutions");
	const landing = useTranslations("LandingPageDesktop");
	const locale = useLocale();

	return (
		<MarketingPageShell>
			<section className="mx-auto grid min-h-[720px] w-full max-w-[1440px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-10 lg:py-20 xl:px-14">
				<div className="max-w-xl">
					<PageEyebrow>WorksRecorded</PageEyebrow>
					<h1 className="mt-5 text-balance text-5xl font-bold leading-[1.03] tracking-[-0.04em] sm:text-6xl lg:text-[4.6rem]">
						{t("title")}
					</h1>
					<p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl dark:text-slate-300">
						{t("block1.p1.prefix")}
						<span className="font-semibold text-[#087a49]">
							{t("block1.p1.highlight")}
						</span>
						{t("block1.p1.suffix")}
					</p>
					<div className="mt-8">
						<PrimaryCta href={`/${locale}/Landing/ContactForm`}>
							{landing("contactUs")}
						</PrimaryCta>
					</div>
				</div>
				<MediaFrame className="relative aspect-[4/3]">
					<Image
						src={Site}
						alt={t("images.siteAlt")}
						fill
						priority
						quality={95}
						className="object-cover object-center"
						sizes="(min-width: 1024px) 62vw, 92vw"
					/>
				</MediaFrame>
			</section>

			<section className="mx-auto w-full max-w-[1328px] px-5 pb-20 sm:px-8 lg:px-10 lg:pb-28">
				<div className="grid items-center gap-12 border-y border-slate-200/80 py-16 lg:grid-cols-2 lg:gap-20 lg:py-24 dark:border-slate-800">
					<MediaFrame>
						<Image
							src={Development}
							alt={t("images.developmentAlt")}
							quality={100}
							className="h-auto w-full"
						/>
					</MediaFrame>
					<div>
						<PageEyebrow>{t("block1.title")}</PageEyebrow>
						<h2 className="mt-5 text-balance text-4xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
							{t("block2.title")}
						</h2>
						<p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
							{t("block1.p2")}
						</p>
						<p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
							{t("block2.p1")}
						</p>
						<p className="mt-6 text-lg font-semibold leading-8 text-[#087a49]">
							{t("block2.p2")}
						</p>
					</div>
				</div>
			</section>
		</MarketingPageShell>
	);
}
