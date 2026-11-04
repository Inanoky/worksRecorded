"use client";

import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Inter, Inter_Tight } from "next/font/google";
import Link from "@/components/landing/navigation/LandingLink";
import { useLocale, useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { NavigationMenuDesktop } from "@/components/landing/NavigationMenuDesktop";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

const inter = Inter({ subsets: ["latin"], variable: "--font-landing-nav" });
const THEME_TRIGGER_ID = "landing-theme-trigger";
const interTight = Inter_Tight({
	subsets: ["latin"],
	variable: "--font-landing-nav-display",
});

export default function HeaderDesktop() {
	const auth = useTranslations("AuthButtons");
	const landing = useTranslations("AgentLanding");
	const locale = useLocale();

	return (
		<header
			className={`${inter.variable} ${interTight.variable} sticky top-0 z-50 border-b border-[#e6ece7] bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90`}
			style={{ fontFamily: "var(--font-landing-nav), sans-serif" }}
		>
			<div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
				<div className="flex shrink-0 items-center gap-3">
					<Link href={`/${locale}/Landing`}>
						<span
							className="text-2xl font-semibold tracking-[-0.04em] text-[#101610] dark:text-white"
							style={{
								fontFamily: "var(--font-landing-nav-display), sans-serif",
							}}
						>
							Works
							<span className="text-[#0a4426] dark:text-emerald-400">
								Recorded
							</span>
						</span>
					</Link>
				</div>

				<div className="flex min-w-0 flex-1 justify-center">
					<NavigationMenuDesktop />
				</div>

				<div className="flex shrink-0 items-center gap-1.5">
					<LanguageSwitcher />
					<ThemeToggle id={THEME_TRIGGER_ID} />

					<LoginLink>
						<button
							type="button"
							className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-[#354038] transition hover:bg-[#f4f7f4] dark:text-slate-200 dark:hover:bg-slate-800"
						>
							{auth("signIn")}
						</button>
					</LoginLink>

					<Link
						href={`/${locale}/Landing/ContactForm`}
						className="inline-flex h-10 items-center rounded-full bg-[#0a4426] px-5 text-sm font-semibold text-white transition hover:bg-[#072616]"
					>
						{landing("nav.contacts")}
					</Link>
				</div>
			</div>
		</header>
	);
}
