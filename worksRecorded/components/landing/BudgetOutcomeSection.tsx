"use client";

import { ArrowRight, BarChart3, ShieldCheck, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";

type BudgetFlow = {
	problem: string;
	solution: string;
	outcome: string;
};

const FLOW_ICONS = [BarChart3, TrendingUp, ShieldCheck];

export function BudgetOutcomeSection() {
	const t = useTranslations("LandingPageDesktop.budgetSection");
	const headingId = useId();
	const flows = t.raw("flows") as BudgetFlow[];

	return (
		<section
			className="relative overflow-hidden border-y border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950"
			aria-labelledby={headingId}
		>
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(22,163,74,0.08),transparent_28%),radial-gradient(circle_at_88%_78%,rgba(22,163,74,0.06),transparent_30%)]" />
			<div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
				<div className="max-w-4xl">
					<p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
						<span
							className="h-0.5 w-8 rounded-full bg-emerald-600"
							aria-hidden="true"
						/>
						{t("eyebrow")}
					</p>
					<h2
						id={headingId}
						className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-6xl dark:text-white"
					>
						{t("titlePrefix")}{" "}
						<span className="text-emerald-700 dark:text-emerald-400">
							{t("titleHighlight")}
						</span>
					</h2>
					<p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
						{t("intro")}
					</p>
				</div>

				<div className="mt-10 grid gap-4">
					{flows.map((flow, index) => {
						const Icon = FLOW_ICONS[index] ?? BarChart3;

						return (
							<article
								key={flow.problem}
								className="grid grid-cols-1 items-center gap-5 rounded-[1.75rem] border border-slate-200 bg-[#fbfcfa] p-5 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-7 lg:grid-cols-[minmax(0,0.72fr)_auto_minmax(0,1.28fr)_auto_minmax(0,0.95fr)] lg:gap-5 dark:border-slate-800 dark:bg-slate-900"
							>
								<div>
									<span className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#b65c57] px-5 text-center text-2xl font-bold tracking-[-0.035em] text-white shadow-lg shadow-[#8d4843]/10 sm:w-auto sm:min-w-52 sm:text-3xl lg:w-full">
										{flow.problem}
									</span>
								</div>

								<div className="flex justify-center text-slate-300 dark:text-slate-600">
									<ArrowRight
										className="size-5 rotate-90 lg:rotate-0"
										aria-hidden="true"
									/>
								</div>

								<div className="flex items-center gap-4">
									<span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
										<Icon className="size-5" aria-hidden="true" />
									</span>
									<div>
										<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
											WorksRecorded
										</p>
										<p className="mt-1 text-base font-semibold leading-6 text-slate-900 sm:text-lg dark:text-white">
											{flow.solution}
										</p>
									</div>
								</div>

								<div className="flex justify-center text-slate-300 dark:text-slate-600">
									<ArrowRight
										className="size-5 rotate-90 lg:rotate-0"
										aria-hidden="true"
									/>
								</div>

								<div>
									<span className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-emerald-700 px-5 text-center text-xl font-bold leading-tight tracking-[-0.025em] text-white shadow-lg shadow-emerald-900/10">
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
