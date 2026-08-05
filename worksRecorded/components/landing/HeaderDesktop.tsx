"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";

import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { NavigationMenuDesktop } from "@/components/landing/NavigationMenuDesktop";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import { useLocale, useTranslations } from "next-intl";
import BisLogo from "@/public/logos/bislogo.png";

export default function HeaderDesktop() {
  const t = useTranslations("AuthButtons");
  const header = useTranslations("Header");
  const locale = useLocale();

  return (
    <>
      {/* This is parent container for the navigation */}
      <div className="relative z-50 grid grid-cols-4 p-5">
        {/* Element 1 */}
        <div>
          <Link href={`/${locale}/Landing`} className="flex flex-row items-center gap-4">
            <h4 className="text-3xl">
              Works<span className="text-green-600">Recorded</span>
            </h4>

            <div className="flex items-center gap-2">
              <Image
                src={BisLogo}
                alt="BIS logo"
                className="h-6 w-auto object-contain"
                priority
              />

              <div className="leading-tight">
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {header("bisIntegrated")}
                </div>
                <div className="text-xs font-semibold text-slate-900">BIS</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Element 2 */}
        <div className="flex col-span-2 col-start-2 justify-center items-center">
          <NavigationMenuDesktop />
        </div>

        {/* Element 3 */}
        <div className="flex justify-end items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />

          <LoginLink>
            <Button variant="secondary">{t("signIn")}</Button>
          </LoginLink>

          <RegisterLink>
            <Button>{t("signUp")}</Button>
          </RegisterLink>
        </div>
      </div>
    </>
  );
}
