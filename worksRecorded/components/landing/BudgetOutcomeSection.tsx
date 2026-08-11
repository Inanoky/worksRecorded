"use client";

import {
	ArrowRight,
	BarChart3,
	FileSpreadsheet,
	ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";

type BudgetFlow = {
	problem: string;
	solution: string;
	outcome: string;
};

const FLOW_ICONS = [FileSpreadsheet, BarChart3, ShieldCheck];

export function BudgetOutcomeSection() {
	const t = useTranslations("LandingPageDesktop.budgetSection");
	const headingId = useId();
	const flows = t.raw("flows") as BudgetFlow[];

	return (
		<section
			className="relative overflow-hidden bg-transparent"
			aria-labelledby={headingId}
		>
			<div className="relative mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24 xl:px-14">
				<div className="max-w-6xl">
					<p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#087a49] dark:text-emerald-300">
						<span className="h-0.5 w-8 rounded-full bg-[#087a49]" aria-hidden="true" />
						{t("eyebrow")}
					</p>

					<h2
						id={headingId}
						className="mt-5 text-balance text-4xl font-bold leading-[1.06] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[3.75rem] xl:text-[4.25rem] dark:text-white"
					>
						{t("titlePrefix")} {" "}
						<span className="text-[#087a49] dark:text-emerald-400">
							{t("titleHighlight")}
						</span>
					</h2>

					<p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
						{t("intro")}
					</p>
				</div>

				<div className="mt-12 hidden grid-cols-[minmax(0,0.78fr)_64px_minmax(0,1.12fr)_64px_minmax(0,1fr)] items-end gap-5 px-8 lg:grid">
					<p className="text-center text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
						{t("problemLabel")}
					</p>
					<span aria-hidden="true" />
					<p className="text-center text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
						{t("solutionLabel")}
					</p>
					<span aria-hidden="true" />
					<p className="text-center text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
						{t("impactLabel")}
					</p>
				</div>

				<div className="mt-5 grid gap-4 lg:mt-4">
					{flows.map((flow, index) => {
						const Icon = FLOW_ICONS[index] ?? BarChart3;

						return (
							<article
								key={flow.problem}
								className="grid grid-cols-1 items-center gap-5 rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.055)] sm:p-8 lg:grid-cols-[minmax(0,0.78fr)_64px_minmax(0,1.12fr)_64px_minmax(0,1fr)] lg:gap-5 dark:border-slate-800 dark:bg-slate-900"
							>
								<div>
									<p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-500 lg:hidden">
										{t("problemLabel")}
									</p>
									<span className="inline-flex min-h-16 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#ce5a59] to-[#b94040] px-6 text-center text-2xl font-bold tracking-[-0.035em] text-white shadow-[0_9px_20px_rgba(185,64,64,0.18)] sm:text-3xl">
										{flow.problem}
									</span>
								</div>

								<FlowArrow />

								<div>
									<p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-500 lg:hidden">
										{t("solutionLabel")}
									</p>
									<div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-5">
										<Icon
											className="size-14 shrink-0 text-[#087a49]"
											strokeWidth={1.65}
											aria-hidden="true"
										/>
										<p className="text-lg font-semibold leading-7 text-slate-950 sm:text-xl dark:text-white">
											{flow.solution}
										</p>
									</div>
								</div>

								<FlowArrow />

								<div>
									<p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-500 lg:hidden">
										{t("impactLabel")}
									</p>
									<span className="inline-flex min-h-16 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#087a49] to-[#00663d] px-6 text-center text-lg font-bold leading-tight tracking-[-0.025em] text-white shadow-[0_9px_20px_rgba(8,122,73,0.18)] sm:text-xl">
										{flow.outcome}
									</span>
								</div>
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}

function FlowArrow() {
	return (
		<div className="flex items-center justify-center gap-1 text-slate-400 dark:text-slate-600">
			<span className="hidden h-px flex-1 bg-slate-200 lg:block" aria-hidden="true" />
			<ArrowRight className="size-6 rotate-90 lg:rotate-0" aria-hidden="true" />
		</div>
	);
}
