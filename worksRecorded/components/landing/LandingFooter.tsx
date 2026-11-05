import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { Inter, Inter_Tight } from "next/font/google";
import { useLocale, useTranslations } from "next-intl";
import Link from "@/components/landing/navigation/LandingLink";
import { AGENTS, DEMO_URL } from "./agents/catalog";

const inter = Inter({ subsets: ["latin"], variable: "--font-landing-footer" });
const interTight = Inter_Tight({
	subsets: ["latin"],
	variable: "--font-landing-footer-display",
});

export default function LandingFooter() {
	const locale = useLocale();
	const footer = useTranslations("Footer");
	const landing = useTranslations("LandingPageDesktop");
	const agents = useTranslations("AgentLanding");

	const dataLinks = [
		...AGENTS.map(({ id }) => ({
			label: agents(`agents.${id}.title`),
			href: `/${locale}/Landing/Agents#${id}`,
		})),
	];
	const companyLinks = [
		{ label: agents("nav.services"), href: `/${locale}/Landing/Services` },
		{
			label: agents("nav.caseStudies"),
			href: `/${locale}/Landing/CaseStudies`,
		},
		{ label: agents("nav.custom"), href: `/${locale}/Landing/Custom` },
		{ label: footer("pricing"), href: `/${locale}/Landing/Pricing` },
		{ label: footer("about"), href: `/${locale}/Landing/About` },
		{
			label: agents("nav.manufacturing"),
			href: `/${locale}/Landing/Manufacturing`,
		},
		{ label: agents("nav.news"), href: `/${locale}/Landing/News` },
		{ label: footer("privacy"), href: `/${locale}/Landing/Privacy` },
	];

	return (
		<footer
			className={`${inter.variable} ${interTight.variable} bg-[#071f14] text-white`}
			style={{ fontFamily: "var(--font-landing-footer), sans-serif" }}
		>
			<div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10 xl:px-14">
				<div
					data-footer-intro
					className="grid gap-10 border-b border-white/10 py-14 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:py-18"
				>
					<div className="max-w-3xl">
						<Link
							href={`/${locale}/Landing`}
							className="inline-block text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
							style={{
								fontFamily: "var(--font-landing-footer-display), sans-serif",
							}}
						>
							Works<span className="text-[#56eb9f]">Recorded</span>
						</Link>
						<p className="mt-5 max-w-xl text-base leading-7 text-[#cfeede] sm:text-lg">
							{agents("description")}
						</p>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
						<Link
							href={DEMO_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex h-12 items-center justify-center rounded-full bg-[#1769ff] px-7 text-sm font-semibold text-white shadow-xl shadow-blue-950/30 transition hover:bg-[#0f5de8]"
						>
							{landing("bookDemo")}
							<ArrowRight className="ml-2 size-4" aria-hidden="true" />
						</Link>
						<Link
							href={`/${locale}/Landing/ContactForm`}
							className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-7 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/10"
						>
							{landing("contactUs")}
						</Link>
					</div>
				</div>

				<div
					data-footer-links
					className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[0.9fr_0.9fr_1.2fr] lg:gap-16"
				>
					<FooterLinks heading={agents("nav.agents")} links={dataLinks} />
					<FooterLinks heading={agents("nav.company")} links={companyLinks} />

					<div className="sm:col-span-2 lg:col-span-1">
						<h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8abda2]">
							{footer("contact")}
						</h2>
						<div className="mt-5 grid gap-4 text-sm text-[#e8f6ed] sm:grid-cols-2 lg:grid-cols-1">
							<a
								href="tel:+37124885690"
								className="group flex min-w-0 items-center gap-3"
							>
								<span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/8 text-[#56eb9f] transition group-hover:bg-white/14">
									<Phone className="size-4" aria-hidden="true" />
								</span>
								<span>{footer("phone")}</span>
							</a>
							<a
								href="mailto:vjaceslavs@worksrecorded.com"
								className="group flex min-w-0 items-center gap-3"
							>
								<span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/8 text-[#56eb9f] transition group-hover:bg-white/14">
									<Mail className="size-4" aria-hidden="true" />
								</span>
								<span className="min-w-0 break-all">
									vjaceslavs@worksrecorded.com
								</span>
							</a>
						</div>
					</div>
				</div>

				<div
					data-footer-legal
					className="grid gap-6 border-t border-white/10 py-8 text-xs leading-5 text-[#8abda2] md:grid-cols-[1fr_auto] md:items-end"
				>
					<div className="space-y-1">
						<p className="font-semibold text-[#cfeede]">Buvconsult SIA</p>
						<p>LV40203643527 · 23.04.2025</p>
						<p className="flex items-start gap-2">
							<MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
							Rīga, Brīvības iela 91–22, LV-1001
						</p>
					</div>
					<div className="md:text-right">
						<p>© {new Date().getFullYear()} WorksRecorded</p>
						<p>{footer("rights")}</p>
					</div>
				</div>
			</div>
		</footer>
	);
}

function FooterLinks({
	heading,
	links,
}: {
	heading: string;
	links: Array<{ label: string; href: string }>;
}) {
	return (
		<nav aria-label={heading}>
			<h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8abda2]">
				{heading}
			</h2>
			<ul className="mt-5 space-y-3 text-sm text-[#e8f6ed]">
				{links.map((link) => (
					<li key={link.href}>
						<Link
							href={link.href}
							className="inline-flex items-center gap-2 transition hover:text-[#56eb9f]"
						>
							{link.label}
							<ArrowRight className="size-3 opacity-45" aria-hidden="true" />
						</Link>
					</li>
				))}
			</ul>
		</nav>
	);
}
