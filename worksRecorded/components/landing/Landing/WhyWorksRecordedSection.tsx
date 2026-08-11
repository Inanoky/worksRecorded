"use client";

import { IconBrandWhatsapp } from "@tabler/icons-react";
import {
	ArrowDown,
	ArrowRight,
	BrainCircuit,
	Camera,
	Clock3,
	Database,
	File,
	FileCheck2,
	HardHat,
	ImageIcon,
	MapPin,
	Mic2,
	Monitor,
} from "lucide-react";
import { useTranslations } from "next-intl";

const reasonIcons = [FileCheck2, Monitor, IconBrandWhatsapp, HardHat];
const stepIcons = [
	Mic2,
	BrainCircuit,
	FileCheck2,
	Camera,
	MapPin,
	Database,
	Clock3,
];

export function WhyWorksRecordedSection() {
	const t = useTranslations("LandingPageDesktop.whyWorksRecordedSection");
	const reasons = t.raw("reasons") as string[];
	const steps = t.raw("steps") as string[];

	return (
		<section
			id="why-worksrecorded"
			className="relative overflow-hidden"
		>
			<div className="relative mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-10 lg:py-10 xl:px-14">
				<div className="text-left">
					<h2 className="text-balance text-4xl font-bold leading-[1.06] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[3.75rem] xl:text-[4.25rem] dark:text-white">
						{t("titlePrefix")} {" "}
						<span className="text-[#087a49] dark:text-emerald-400">
							{t("titleHighlight")}
						</span>
					</h2>
					<span
						className="mt-6 block h-1 w-12 rounded-full bg-[#087a49]"
						aria-hidden="true"
					/>
				</div>

				<div className="mt-7 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
					<div className="grid md:grid-cols-2 xl:grid-cols-4">
						{reasons.map((reason, index) => {
							const Icon = reasonIcons[index] ?? FileCheck2;

							return (
								<article
									key={reason}
									className="relative flex min-h-64 flex-col items-center justify-center px-7 py-9 text-center md:[&:nth-child(even)]:border-l md:[&:nth-child(n+3)]:border-t xl:min-h-48 xl:py-6 xl:[&:nth-child(n+3)]:border-t-0 xl:[&:not(:first-child)]:border-l dark:border-slate-800"
								>
									<span className="grid size-20 place-items-center text-[#087a49]">
										{index === 0 ? (
											<BisDocumentIcon className="size-16" />
										) : index === 1 ? (
											<MonitorChartIcon />
										) : (
											<Icon className="size-16" strokeWidth={1.55} aria-hidden="true" />
										)}
									</span>
									<p className="mt-4 max-w-[18rem] text-base font-medium leading-7 text-slate-900 dark:text-slate-100">
										{reason}
									</p>
								</article>
							);
						})}
					</div>
				</div>

				<p className="mx-auto mt-10 max-w-[1260px] text-balance text-center text-3xl font-bold leading-[1.18] tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-[2.25rem] dark:text-white">
					<span className="text-[#087a49] dark:text-emerald-400">
						{t("statementPrefix")}
					</span>{" "}
					{t("statementBody")} {" "}
					<span className="text-[#087a49] dark:text-emerald-400">
						{t("statementHighlight")}
					</span>
				</p>

				<div className="mt-6 rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8 xl:p-6 dark:border-slate-800 dark:bg-slate-900/90">
					<div className="hidden items-start gap-2 xl:flex">
						{steps.map((step, index) => {
							const Icon = stepIcons[index] ?? FileCheck2;

							return (
								<div key={step} className="contents">
									<article className="min-w-0 flex-1 text-center">
										<StepIcon index={index} Icon={Icon} />
										<p className="mt-4 text-sm font-medium leading-5 text-slate-800 dark:text-slate-200">
											{step}
										</p>
									</article>
									{index < steps.length - 1 && (
										<ArrowRight
											className="mt-11 size-6 shrink-0 text-slate-500"
											strokeWidth={1.65}
											aria-hidden="true"
										/>
									)}
								</div>
							);
						})}
					</div>

					<div className="grid gap-4 xl:hidden">
						{steps.map((step, index) => {
							const Icon = stepIcons[index] ?? FileCheck2;

							return (
								<div key={step}>
									<article className="grid grid-cols-[5.5rem_1fr] items-center gap-5 rounded-2xl bg-[#f7f8f5] p-4 sm:grid-cols-[7rem_1fr] sm:p-5 dark:bg-slate-950/70">
										<StepIcon index={index} Icon={Icon} compact />
										<p className="text-base font-medium leading-7 text-slate-800 sm:text-lg dark:text-slate-200">
											{step}
										</p>
									</article>
									{index < steps.length - 1 && (
										<ArrowDown
											className="mx-auto mt-4 size-5 text-slate-400"
											aria-hidden="true"
										/>
									)}
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
}

function StepIcon({
	index,
	Icon,
	compact = false,
}: {
	index: number;
	Icon: typeof Mic2;
	compact?: boolean;
}) {
	return (
		<div
			className={`relative mx-auto grid place-items-center rounded-full border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
				compact ? "size-20 sm:size-24" : "size-24"
			}`}
		>
			<span className="absolute -top-3 grid size-8 place-items-center rounded-full bg-[#087a49] text-sm font-bold text-white shadow-md shadow-emerald-900/15">
				{index + 1}
			</span>
			{index === 0 ? (
				<span className="flex items-end gap-1 text-slate-950 dark:text-white">
					<Mic2 className={compact ? "size-8" : "size-9"} strokeWidth={1.65} />
					<ImageIcon className={compact ? "size-7" : "size-8"} strokeWidth={1.65} />
				</span>
			) : index === 2 ? (
				<BisDocumentIcon className={compact ? "size-11 sm:size-12" : "size-12"} />
			) : (
				<Icon
					className={compact ? "size-10 sm:size-12" : "size-12"}
					strokeWidth={1.55}
					aria-hidden="true"
				/>
			)}
		</div>
	);
}

function BisDocumentIcon({ className }: { className: string }) {
	return (
		<span className={`relative block ${className}`} aria-hidden="true">
			<File className="size-full" strokeWidth={1.55} />
			<span className="absolute inset-x-0 top-[43%] text-center text-[0.24em] font-extrabold tracking-[-0.04em]">
				BIS
			</span>
			<span className="absolute bottom-[8%] right-[-5%] grid size-[0.36em] place-items-center rounded-full bg-white text-[0.25em] font-black text-[#087a49] ring-2 ring-[#087a49] dark:bg-slate-900">
				✓
			</span>
		</span>
	);
}

function MonitorChartIcon() {
	return (
		<span className="relative block size-16" aria-hidden="true">
			<Monitor className="size-full" strokeWidth={1.55} />
			<span className="absolute inset-x-[23%] top-[28%] flex h-[28%] items-end justify-between gap-1">
				<span className="h-1/3 w-1 rounded-full bg-current" />
				<span className="h-2/3 w-1 rounded-full bg-current" />
				<span className="h-full w-1 rounded-full bg-current" />
			</span>
		</span>
	);
}
