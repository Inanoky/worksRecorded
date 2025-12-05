// app/(marketing)/page.tsx — Mobile-first, responsive landing page

import Link from "next/link";
import Image from "next/image";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import Dashboard from "@/public/frontend/pages/Home/Dashboard.png";
import Dashboard2 from "@/public/frontend/pages/Home/Dashboard2.png";
import { Features } from "@/components/landing/Features";
import {
  Header,
  Header2,
  SmallDescription,
  WhatDoWeDo,
  HowDoWeDoThat,
  Why,
  NoIntegration,
} from "@/components/landing/Landing/Text";

export default function LandingPageMobile() {
  return (
    <>
      <section className="relative flex items-center justify-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-20">
          {/* Hero */}
          <div className="text-center">
            <span className="inline-block text-xs sm:text-sm text-primary font-medium tracking-tight bg-primary/10 px-3 sm:px-4 py-1.5 rounded-full">
              Construction project management solution
            </span>

            <h1 className="mt-6 sm:mt-8 text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight sm:leading-none">
              {Header}
              <span className="block text-primary">{Header2}</span>
            </h1>

            <p className="max-w-2xl mx-auto mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg font-light text-muted-foreground tracking-tight">
              {SmallDescription}
            </p>

            <p className="max-w-xl mx-auto mt-3 text-xs sm:text-sm text-muted-foreground">
              {NoIntegration}
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto justify-center">
              <LoginLink>
                <Button variant="secondary" className="w-full sm:w-auto">
                  Sign in
                </Button>
              </LoginLink>
              <RegisterLink>
                <Button className="w-full sm:w-auto">Try for free</Button>
              </RegisterLink>
            </div>
          </div>

          {/* Block 1 — How we do it */}
          <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center">
            <div className="md:col-span-2 order-1">
              <Image
                src={Dashboard}
                alt="Dashboard preview"
                priority
                className="w-full rounded-xl lg:rounded-2xl border shadow-2xl shadow-black/20"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
              />
            </div>

            <div className="order-2 md:order-none text-left md:text-right">
              <div className="text-base sm:text-lg md:text-xl leading-relaxed">
                <HowDoWeDoThat />
              </div>
            </div>
          </div>

          {/* Block 2 — Problems we solve */}
          <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center">
            <div className="order-2 md:order-none">
              <div className="text-base sm:text-lg md:text-xl leading-relaxed">
                <WhatDoWeDo />
              </div>
            </div>

            <div className="md:col-span-2">
              <Image
                src={Dashboard2}
                alt="Analytics preview"
                priority
                className="w-full rounded-xl lg:rounded-2xl border shadow-2xl shadow-black/20"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
              />
            </div>
          </div>

          {/* Block 3 — Why Buvconsult */}
          <div className="mt-10 sm:mt-14">
            <div className="mx-auto max-w-3xl">
              <Why />
            </div>
          </div>
        </div>
      </section>

      <Features />
    </>
  );
}
