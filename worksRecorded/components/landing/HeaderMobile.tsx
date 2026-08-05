import * as React from "react";
import Link from "next/link";
import Image from "next/image";

import { NavigationMenuMobile } from "./NavigationMenuMobile";
import BisLogo from "@/public/logos/bislogo.png";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import { useLocale, useTranslations } from "next-intl";

export default function HeaderMobile() {
  const locale = useLocale();
  const header = useTranslations("Header");

  return (
      <div className="relative z-50 flex items-center justify-between gap-2 p-4 sm:p-5">
        {/* Element 1 */}
        <div>
          <Link href={`/${locale}/Landing`} className="flex flex-row items-center gap-3">
            <h4 className="text-2xl sm:text-3xl">
              Works<span className="text-primary">Recorded</span>
            </h4>

            <div className="hidden sm:flex items-center gap-2">
              <Image
                src={BisLogo}
                alt="BIS logo"
                className="h-5 w-auto object-contain"
                priority
              />

              <div className="leading-tight">
                <div className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                  {header("bisIntegrated")}
                </div>
                <div className="text-[11px] font-semibold text-slate-900">
                  BIS
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Element 2 */}
        <div className="flex shrink-0 items-center justify-end gap-1">
          <LanguageSwitcher />
          <NavigationMenuMobile />
        </div>
      </div>
  );
}
