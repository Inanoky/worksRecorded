"use client";

import {
  LoginLink,
  RegisterLink,
} from "@kinde-oss/kinde-auth-nextjs/components";
import { Inter, Inter_Tight } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { NavigationMenuDesktop } from "@/components/landing/NavigationMenuDesktop";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import BisLogo from "@/public/logos/bislogo.png";

const inter = Inter({ subsets: ["latin"], variable: "--font-landing-nav" });
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-landing-nav-display",
});

export default function HeaderDesktop() {
  const auth = useTranslations("AuthButtons");
  const landing = useTranslations("LandingPageDesktop");
  const locale = useLocale();

  return (
    <header
      className={`${inter.variable} ${interTight.variable} sticky top-0 z-50 border-b border-[#e6ece7] bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90`}
      style={{ fontFamily: "var(--font-landing-nav), sans-serif" }}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <Link
          href={`/${locale}/Landing`}
          className="flex shrink-0 items-center gap-3"
        >
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

          <span className="hidden items-center gap-2 rounded-full border border-[#dbe7de] px-3 py-1.5 text-xs font-medium text-[#66736b] xl:flex dark:border-slate-700 dark:text-slate-300">
            <Image
              src={BisLogo}
              alt={landing("bisLogoAlt")}
              className="h-4 w-auto"
              priority
            />
            {landing("bisLogoLabel")}
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">
          <NavigationMenuDesktop />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <LanguageSwitcher />
          <ThemeToggle />

          <LoginLink>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-[#354038] transition hover:bg-[#f4f7f4] dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {auth("signIn")}
            </button>
          </LoginLink>

          <RegisterLink>
            <button
              type="button"
              className="inline-flex h-10 items-center rounded-full bg-[#0a4426] px-5 text-sm font-semibold text-white transition hover:bg-[#072616]"
            >
              {auth("signUp")}
            </button>
          </RegisterLink>
        </div>
      </div>
    </header>
  );
}
