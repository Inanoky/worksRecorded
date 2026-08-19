"use client";

import type { StaticImageData } from "next/image";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import DepromLogo from "@/public/logos/deprom.webp";
import LecLogo from "@/public/logos/lec.png";
import ZtcLogo from "@/public/logos/ztc.jpg";

type Client = {
	name: string;
	descriptionKey: string;
	href: string;
	logo: StaticImageData | string;
	logoWidth?: number;
	logoHeight?: number;
};

const CLIENTS: Client[] = [
	{
		name: "Deprom",
		descriptionKey: "clientDepromDescription",
		href: "https://deprom.lv/",
		logo: DepromLogo,
	},
	{
		name: "LEC — Latvijas Energoceltnieks",
		descriptionKey: "clientLecDescription",
		href: "https://www.lec.lv/",
		logo: LecLogo,
	},
	{
		name: "ZTC",
		descriptionKey: "clientZtcDescription",
		href: "https://ztc.lv/",
		logo: ZtcLogo,
	},
	{
		name: "Stone & Tree",
		descriptionKey: "clientStoneAndTreeDescription",
		href: "https://stoneandtree.lv/",
		logo: "/logos/stone-and-tree.svg",
		logoWidth: 844,
		logoHeight: 300,
	},
];

export function Logos() {
	const t = useTranslations("LandingPageDesktop");

	return (
		<section className="relative bg-transparent">
			<div className="mx-auto w-full max-w-[1440px] px-5 pb-20 pt-10 sm:px-8 lg:px-10 lg:pb-28 lg:pt-12 xl:px-14">
				{/* Logo strip */}
				<div className="logo-marquee overflow-hidden py-1 [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
					<div className="logo-marquee-track flex w-max items-center gap-6">
						{[...CLIENTS, ...CLIENTS].map((client, index) => (
							<Link
								key={`${client.name}-${index}`}
								href={client.href}
								target="_blank"
								rel="noopener noreferrer"
								aria-hidden={index >= CLIENTS.length}
								tabIndex={index >= CLIENTS.length ? -1 : undefined}
								className="group flex h-[84px] w-[260px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-5 shadow-sm ring-1 ring-black/5 transition hover:shadow-md hover:ring-[#b8dfcc] sm:w-[280px] dark:border-slate-800 dark:bg-white dark:ring-white/5 dark:hover:ring-emerald-900"
							>
								<Image
									src={client.logo}
									alt={client.name}
									width={client.logoWidth}
									height={client.logoHeight}
									className="max-h-10 w-auto object-contain grayscale opacity-70 transition duration-300 group-hover:grayscale-0 group-hover:opacity-100 group-focus-visible:grayscale-0 group-focus-visible:opacity-100"
								/>
							</Link>
						))}
					</div>
				</div>

				<style jsx>{`
					.logo-marquee-track {
						animation: logo-marquee 24s linear infinite;
					}

					.logo-marquee:hover .logo-marquee-track,
					.logo-marquee:focus-within .logo-marquee-track {
						animation-play-state: paused;
					}

					@keyframes logo-marquee {
						from {
							transform: translateX(0);
						}
						to {
							transform: translateX(calc(-50% - 0.75rem));
						}
					}

					@media (prefers-reduced-motion: reduce) {
						.logo-marquee {
							overflow-x: auto;
							mask-image: none;
						}

						.logo-marquee-track {
							animation: none;
						}
					}
				`}</style>

				<p className="mt-5 text-center text-xs font-medium leading-5 text-slate-500/80 dark:text-slate-400/80">
					{t("clientsSubheading")}
				</p>

				<div className="hidden mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
					{CLIENTS.map((client) => {
						const rawParagraphs = t.raw(client.descriptionKey);
						const paragraphs = Array.isArray(rawParagraphs)
							? rawParagraphs.filter(
									(paragraph): paragraph is string => typeof paragraph === "string",
								)
							: [];
						return (
							<div
								key={client.name}
								className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/5"
							>
								<h3 className="text-sm font-semibold text-slate-950 dark:text-white">
									{client.name}
								</h3>
								<div className="mt-2 space-y-3">
									{paragraphs.map((paragraph) => (
										<p
											key={paragraph}
											className="text-sm leading-6 text-slate-600 dark:text-slate-300"
										>
											{paragraph}
										</p>
									))}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
