"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AGENTS } from "@/components/landing/agents/catalog";
import { MAIN_LINKS } from "@/components/landing/NavigationLinks";
import Link from "@/components/landing/navigation/LandingLink";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export function NavigationMenuDesktop() {
	const [open, setOpen] = useState(false);
	const t = useTranslations("AgentLanding");
	const locale = useLocale();
	const linkClass =
		"inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-[#354038] transition-colors hover:bg-[#f0f5ef] focus-visible:outline-2 focus-visible:outline-emerald-700 dark:text-slate-200 dark:hover:bg-slate-800";

	return (
		<nav aria-label={t("nav.menu")} className="flex items-center gap-0.5">
			<Popover modal open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button type="button" className={linkClass}>
						{t("nav.agents")}
						<ChevronDown size={13} aria-hidden="true" />
					</button>
				</PopoverTrigger>
				<PopoverContent
					aria-label={t("nav.agents")}
					align="start"
					sideOffset={14}
					className="z-[70] max-h-[var(--radix-popover-content-available-height)] w-[min(660px,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
				>
					<div className="grid grid-cols-2 gap-1">
						{AGENTS.map(({ id, icon: Icon }) => (
							<Link
								key={id}
								href={`/${locale}/Landing/Agents#${id}`}
								onClick={() => setOpen(false)}
								className="flex items-start gap-3 rounded-lg p-3 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700 dark:hover:bg-slate-800"
							>
								<Icon
									className="mt-0.5 shrink-0 text-[#087a49] dark:text-emerald-400"
									size={19}
									aria-hidden="true"
								/>
								<span>
									<span className="block text-sm font-semibold">
										{t(`agents.${id}.title`)}
									</span>
									<span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
										{t(`agents.${id}.question`)}
									</span>
								</span>
							</Link>
						))}
					</div>
					<Link
						href={`/${locale}/Landing/Agents`}
						onClick={() => setOpen(false)}
						className="mt-2 flex items-center justify-between rounded-lg bg-[#eef5ef] px-4 py-3 text-sm font-semibold text-[#0a4426] dark:bg-slate-800 dark:text-emerald-300"
					>
						{t("nav.allAgents")}
						<ArrowRight size={17} aria-hidden="true" />
					</Link>
				</PopoverContent>
			</Popover>
			{MAIN_LINKS.map(({ href, labelKey }) => (
				<Link key={href} href={`/${locale}${href}`} className={linkClass}>
					{t(`nav.${labelKey}`)}
				</Link>
			))}
		</nav>
	);
}
