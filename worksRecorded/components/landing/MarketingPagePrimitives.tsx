import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function MarketingPageShell({ children }: { children: ReactNode }) {
	return (
		<main className="overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(8,122,73,0.12),transparent_18%),radial-gradient(circle_at_88%_42%,rgba(23,105,255,0.055),transparent_22%),linear-gradient(180deg,#f7f8f5_0%,#ffffff_46%,#f7f8f5_100%)] text-slate-950 dark:bg-slate-950 dark:text-white">
			{children}
		</main>
	);
}

export function PageEyebrow({ children }: { children: ReactNode }) {
	return (
		<p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#087a49]">
			<span className="h-0.5 w-8 rounded-full bg-[#087a49]" />
			{children}
		</p>
	);
}

export function PrimaryCta({
	href,
	children,
}: {
	href: string;
	children: ReactNode;
}) {
	return (
		<Link
			href={href}
			data-landing-pressable
			className="inline-flex h-13 items-center justify-center rounded-full bg-[#1769ff] px-8 text-base font-semibold text-white shadow-xl shadow-blue-500/20 transition hover:bg-[#0f5de8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#087a49]"
		>
			{children}
			<ArrowRight className="ml-2 size-4" aria-hidden="true" />
		</Link>
	);
}

export function MediaFrame({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.16)] ${className}`}
		>
			{children}
		</div>
	);
}

export function CheckList({ items }: { items: string[] }) {
	return (
		<ul className="mt-7 grid gap-4">
			{items.map((item) => (
				<li
					key={item}
					className="flex items-start gap-3 text-base font-medium leading-7 text-slate-700 sm:text-lg dark:text-slate-200"
				>
					<span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-[#087a49]">
						<Check className="size-4" aria-hidden="true" />
					</span>
					<span>{item}</span>
				</li>
			))}
		</ul>
	);
}
