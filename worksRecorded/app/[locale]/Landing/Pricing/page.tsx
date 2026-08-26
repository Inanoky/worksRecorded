import { Check, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { useLocale, useTranslations } from "next-intl";
import {
	MarketingPageShell,
	PageEyebrow,
	PrimaryCta,
} from "@/components/landing/MarketingPagePrimitives";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale } = await params;
	return buildLandingMetadata({
		locale,
		path: "/Landing/Pricing",
		title: "WorksRecorded Pricing | Construction AI Software",
		description:
			"View WorksRecorded pricing for AI-powered site records, timesheets, and construction analytics.",
		keywords: [
			"construction software pricing",
			"AI construction software",
			"WorksRecorded",
		],
	});
}

export default function Page() {
	const t = useTranslations("Pricing");
	const landing = useTranslations("LandingPageDesktop");
	const locale = useLocale();

	return (
		<MarketingPageShell>
			<section className="mx-auto grid min-h-[720px] w-full max-w-[1328px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:py-20">
				<div className="max-w-xl">
					<PageEyebrow>WorksRecorded</PageEyebrow>
					<h1 className="mt-5 text-balance text-5xl font-bold leading-[1.03] tracking-[-0.04em] sm:text-6xl lg:text-[4.35rem]">
						{t("title.prefix")}{" "}
						<span className="text-[#087a49]">{t("title.highlight")}</span>
					</h1>
					<p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl dark:text-slate-300">
						{t("description")}
					</p>
				</div>

				<div className="relative rounded-[2rem] bg-[#073e27] p-2 shadow-[0_32px_90px_rgba(6,78,48,0.25)]">
					<div className="rounded-[1.6rem] bg-white p-7 sm:p-10 dark:bg-slate-950">
						<div className="flex items-start justify-between gap-6">
							<div>
								<p className="text-sm font-bold uppercase tracking-[0.18em] text-[#087a49]">
									WorksRecorded
								</p>
								<p className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
									{t("title.prefix")}
								</p>
							</div>
							<span className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-[#087a49]">
								<Sparkles className="size-6" aria-hidden="true" />
							</span>
						</div>
						<p className="mt-5 text-xl font-semibold text-[#087a49]">
							{t("title.highlight")}
						</p>
						<div className="mt-7 rounded-2xl bg-[#f1f8f4] p-5 ring-1 ring-emerald-900/10 dark:bg-emerald-950/50 dark:ring-emerald-200/10">
							<p className="text-sm font-bold uppercase tracking-[0.15em] text-[#087a49]">
								{t("bisService.title")}
							</p>
							<div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
								<p className="text-4xl font-bold tracking-[-0.04em]">
									{t("bisService.price")}
								</p>
								<p className="text-base font-medium text-slate-600 dark:text-slate-300">
									{t("bisService.period")}
								</p>
							</div>
						</div>
						<div className="my-8 h-px bg-slate-200 dark:bg-slate-800" />
						<ul className="grid gap-4">
							{["WhatsApp", "AI", "BIS"].map((item) => (
								<li
									key={item}
									className="flex items-center gap-3 text-lg font-medium text-slate-700 dark:text-slate-200"
								>
									<span className="grid size-7 place-items-center rounded-full bg-emerald-100 text-[#087a49]">
										<Check className="size-4" aria-hidden="true" />
									</span>
									{item}
								</li>
							))}
						</ul>
						<div className="mt-9">
							<PrimaryCta href={`/${locale}/Landing/ContactForm`}>
								{landing("contactUs")}
							</PrimaryCta>
						</div>
					</div>
				</div>
			</section>
		</MarketingPageShell>
	);
}
