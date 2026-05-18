import * as React from "react";
import Link from "next/link";
import Image from "next/image";

import { NavigationMenuMobile } from "./NavigationMenuMobile";
import BisLogo from "@/public/logos/bislogo.png";

export default function HeaderMobile() {
  return (
    <>
      {/* This is parent container for the navigation */}
      <div className="relative z-50 grid grid-cols-2 justify-between p-5">
        {/* Element 1 */}
        <div>
          <Link href="/" className="flex flex-row items-center gap-3">
            <h4 className="text-3xl">
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
                  Integrēts ar
                </div>
                <div className="text-[11px] font-semibold text-slate-900">
                  BIS
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Element 2 */}
        <div className="flex col-span-2 col-start-2 justify-end items-center">
          <NavigationMenuMobile />
        </div>
      </div>
    </>
  );
}