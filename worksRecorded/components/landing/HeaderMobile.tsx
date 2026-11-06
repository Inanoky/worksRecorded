"use client";

import { Inter, Inter_Tight } from "next/font/google";
import Link from "next/link";
import { useLocale } from "next-intl";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { NavigationMenuMobile } from "./NavigationMenuMobile";

const inter = Inter({ subsets: ["latin"], variable: "--font-landing-nav" });
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-landing-nav-display",
});

export default function HeaderMobile() {
  const locale = useLocale();

  return (
    <header
      className={`${inter.variable} ${interTight.variable} sticky top-0 z-50 border-b border-[#e6ece7] bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90`}
      style={{ fontFamily: "var(--font-landing-nav), sans-serif" }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3.5 sm:px-5">
        <Link href={`/${locale}/Landing`} className="shrink-0">
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

        <div className="flex shrink-0 items-center gap-1">
          <LanguageSwitcher />
          <NavigationMenuMobile />
        </div>
      </div>
    </header>
  );
}
