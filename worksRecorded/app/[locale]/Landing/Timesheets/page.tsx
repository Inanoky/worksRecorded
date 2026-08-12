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
import MapImage from "@/public/frontend/pages/Timesheets/Map.png";
import TimesheetsDashboard from "@/public/frontend/pages/Timesheets/Timesheets1.png";
import TimesheetsWhatsapp from "@/public/frontend/pages/Timesheets/TimesheetsWhatsapp.png";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale } = await params;
	return buildLandingMetadata({
		locale,
		path: "/Landing/Timesheets",
		title: "Construction Timesheets via WhatsApp | WorksRecorded",
		description:
			"Automate construction timesheets with WhatsApp clock-ins and AI-powered processing.",
		keywords: [
			"construction timesheets",
			"WhatsApp timesheets",
			"construction software",
			"WorksRecorded",
		],
	});
}

export default function Page() {
	const t = useTranslations("Timesheets");
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

				<div className="relative pb-10 sm:pb-14">
					<MediaFrame className="relative aspect-[16/9]">
						<Image
							src={TimesheetsDashboard}
							alt={t("images.dashboardAlt")}
							fill
							priority
							quality={100}
							className="object-cover object-top"
							sizes="(min-width: 1024px) 62vw, 92vw"
						/>
					</MediaFrame>
					<div className="absolute -bottom-2 right-4 w-[25%] min-w-32 sm:right-8">
						<Image
							src={TimesheetsWhatsapp}
							alt={t("images.whatsappAlt")}
							quality={100}
							className="h-auto w-full rounded-[1.5rem] border-[5px] border-slate-950 shadow-2xl"
							sizes="(min-width: 1024px) 15vw, 28vw"
						/>
					</div>
				</div>
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
							src={MapImage}
							alt={t("images.geofenceAreaAlt")}
							quality={100}
							className="h-auto w-full"
						/>
					</MediaFrame>
				</div>
			</section>
		</MarketingPageShell>
	);
}
