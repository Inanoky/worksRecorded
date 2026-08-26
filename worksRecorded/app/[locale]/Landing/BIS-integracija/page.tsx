import { Check, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
	MarketingPageShell,
	MediaFrame,
	PageEyebrow,
	PrimaryCta,
} from "@/components/landing/MarketingPagePrimitives";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";
import BisConnection from "@/public/frontend/pages/Settings/ExplanationBisConnection.png";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale } = await params;
	return buildLandingMetadata({
		locale,
		path: "/Landing/BIS-integracija",
		title: "BIS integrācija un automatizācija | WorksRecorded",
		description:
			"BIS automatizācija no WhatsApp: materiālu, būvizstrādājumu un ikdienas darbu aizpildīšana ar WorksRecorded.",
		keywords: [
			"BIS integrācija",
			"BIS automatizācija",
			"WhatsApp BIS",
			"WorksRecorded",
			"AI būvniecībā",
		],
	});
}

export default async function BISIntegracijaPage({ params }: PageProps) {
	const { locale } = await params;
	if (locale !== "lv") notFound();

	return (
		<MarketingPageShell>
			<section className="mx-auto grid min-h-[720px] w-full max-w-[1440px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-20 xl:px-14">
				<div className="max-w-xl">
					<PageEyebrow>WorksRecorded</PageEyebrow>
					<h1 className="mt-5 text-balance text-5xl font-bold leading-[1.03] tracking-[-0.04em] sm:text-6xl lg:text-[4.6rem]">
						BIS <span className="text-[#087a49]">integrācija</span>
					</h1>
					<p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl dark:text-slate-300">
						WorksRecorded savieno ierasto saziņu WhatsApp ar BIS, lai mazinātu
						dubulto darbu un ietaupītu būvdarbu vadītāju laiku.
					</p>
					<div className="mt-8">
						<PrimaryCta href="/lv/Landing/ContactForm">
							Pieteikt demonstrāciju
						</PrimaryCta>
					</div>
				</div>
				<MediaFrame className="bg-[#f6f8f6] p-6 sm:p-10">
					<Image
						src={BisConnection}
						alt="WorksRecorded un BIS savienojuma izveides soļi"
						priority
						quality={100}
						className="mx-auto h-auto w-full max-w-2xl"
						sizes="(min-width: 1024px) 54vw, 92vw"
					/>
				</MediaFrame>
			</section>

			<section className="mx-auto w-full max-w-[1328px] px-5 pb-20 sm:px-8 lg:px-10 lg:pb-28">
				<div className="grid overflow-hidden rounded-[2rem] bg-[#073e27] text-white shadow-[0_30px_90px_rgba(6,78,48,0.2)] lg:grid-cols-[1.1fr_0.9fr]">
					<div className="p-7 sm:p-10 lg:p-14">
						<p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
							<span className="h-0.5 w-8 rounded-full bg-emerald-300" />
							BIS dokumentācijas serviss
						</p>
						<h2 className="mt-5 max-w-3xl text-balance text-4xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
							Pilna BIS dokumentācijas pārvaldība
						</h2>
						<p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50/85">
							WorksRecorded komanda sagatavo, aizpilda un uztur jūsu BIS
							dokumentāciju, sadarbojoties tieši ar objekta vadību.
						</p>
						<ul className="mt-8 grid gap-4 sm:grid-cols-2">
							{[
								"Materiāli un būvizstrādājumi",
								"MAF",
								"Ikdienas darbi",
								"Darbu akti",
							].map((item) => (
								<li
									key={item}
									className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 text-base font-semibold ring-1 ring-white/10"
								>
									<span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-300 text-[#073e27]">
										<Check className="size-4" aria-hidden="true" />
									</span>
									{item}
								</li>
							))}
						</ul>
					</div>

					<div className="m-3 flex flex-col justify-between rounded-[1.4rem] bg-white p-7 text-slate-950 sm:m-5 sm:p-9 dark:bg-slate-950 dark:text-white">
						<div>
							<span className="grid size-14 place-items-center rounded-2xl bg-[#e7f8ef] text-[#087a49] dark:bg-emerald-950">
								<MessageCircle className="size-7" aria-hidden="true" />
							</span>
							<h3 className="mt-6 text-2xl font-bold tracking-[-0.025em]">
								Informācija WhatsApp, dokumentācija BIS
							</h3>
							<p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
								Objekta vadītājs nosūta informāciju uz mūsu WhatsApp numuru, un
								mēs noformējam nepieciešamo dokumentāciju BIS. Jūsu komandai nav
								jāvelta laiks datu pārrakstīšanai.
							</p>
						</div>
						<div className="mt-8 border-t border-slate-200 pt-7 dark:border-slate-800">
							<p className="text-sm font-bold uppercase tracking-[0.16em] text-[#087a49]">
								BIS aizpildīšana
							</p>
							<p className="mt-2 text-4xl font-bold tracking-[-0.04em]">
								150 €
							</p>
							<p className="mt-1 text-base text-slate-600 dark:text-slate-300">
								par BIS lietu mēnesī
							</p>
							<div className="mt-6">
								<PrimaryCta href="/lv/Landing/ContactForm">
									Pieteikt pakalpojumu
								</PrimaryCta>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="mx-auto w-full max-w-[1328px] px-5 pb-20 sm:px-8 lg:px-10 lg:pb-28">
				<div className="border-y border-slate-200/80 py-16 lg:py-24 dark:border-slate-800">
					<PageEyebrow>Praktiski piemēri</PageEyebrow>
					<h2 className="mt-5 max-w-4xl text-balance text-4xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
						No WhatsApp ziņas līdz sakārtotam ierakstam BIS
					</h2>
					<div className="mt-12 grid gap-12 lg:grid-cols-2">
						<VideoCard
							title="Materiālu un būvizstrādājumu pievienošana caur WhatsApp"
							description="Praktisks piemērs, kā AI palīdz ievadīt informāciju BIS un novērst atkārtotu datu pārrakstīšanu."
							videoId="2hmYq3Rf3SI"
						/>
						<VideoCard
							title="Ikdienas darbu automātiska aizpildīšana"
							description="Balss ziņa kļūst par strukturētu darba ierakstu. Laika ekonomija — līdz 30 stundām mēnesī."
							videoId="AYSD96mBqEc"
						/>
					</div>
				</div>
			</section>
		</MarketingPageShell>
	);
}

function VideoCard({
	title,
	description,
	videoId,
}: {
	title: string;
	description: string;
	videoId: string;
}) {
	return (
		<article>
			<div className="aspect-video overflow-hidden rounded-[2rem] bg-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
				<iframe
					title={title}
					src={`https://www.youtube.com/embed/${videoId}`}
					className="h-full w-full"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					referrerPolicy="strict-origin-when-cross-origin"
					allowFullScreen
				/>
			</div>
			<h3 className="mt-6 text-2xl font-bold leading-tight tracking-[-0.025em]">
				{title}
			</h3>
			<p className="mt-3 text-lg leading-8 text-slate-600 dark:text-slate-300">
				{description}
			</p>
		</article>
	);
}
