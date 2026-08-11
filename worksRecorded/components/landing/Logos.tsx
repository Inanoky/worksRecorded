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
	logo: StaticImageData;
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
];

export function Logos() {
	const t = useTranslations("LandingPageDesktop");

	return (
		<section className="relative bg-transparent">
			<div className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-12 lg:py-16 text-center">
				<h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
					{t("clientsHeading")}
				</h2>
				<p className="mt-3 text-base sm:text-lg text-slate-700 dark:text-slate-300">
					{t("clientsSubheading")}
				</p>

				{/* Logo strip */}
				<div className="mt-8 grid grid-cols-1 sm:grid-cols-3 items-center gap-6">
					{CLIENTS.map((client) => (
						<Link
							key={client.name}
							href={client.href}
							target="_blank"
							rel="noopener noreferrer"
							className="group flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-sm ring-1 ring-black/5 transition hover:shadow-md hover:ring-[#b8dfcc] dark:border-slate-800 dark:bg-slate-900 dark:ring-white/5 dark:hover:ring-emerald-900"
						>
							<Image
								src={client.logo}
								alt={client.name}
								className="max-h-10 w-auto object-contain"
							/>
						</Link>
					))}
				</div>

				<div className="hidden mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
					{CLIENTS.map((client) => {
						const paragraphs = t.raw(client.descriptionKey) as string[];
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
