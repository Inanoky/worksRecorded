// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\components\landing\Landing\LandingPageDesktop.tsx

"use client";

import Link from "next/link";
import Image from "next/image";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";

import Dashboard2 from "@/public/frontend/pages/Home/Dashboard2.png";
import LandingHero from "@/public/frontend/pages/Home/LandingHero.png";

import { Features } from "@/components/landing/Features";
import {
  Header,
  Header2,
  HowDoWeDoThat,
  SmallDescription,
  WhatDoWeDo,
  Why,
} from "@/components/landing/Landing/Text";

export default function LandingPage() {
  return (
    <>
      {/* TOP HEADER */}
      <section className="bg-slate-50/60 dark:bg-slate-950 ">
        <div className="w-full max-w-8xl mx-auto px-4 lg:px-6 py-10 lg:py-14 text-center">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-xs font-medium text-primary tracking-tight">
            Built for trade contractors &amp; site managers
          </span>

          <h1 className="mt-5 text-3xl sm:text-4xl md:text-6xl font-semibold leading-tight">
            Site records with WhatsApp
          </h1>

          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            {SmallDescription}
          </p>

          <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
            <RegisterLink>
              <Button size="lg">Start free trial</Button>
            </RegisterLink>

            <LoginLink>
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </LoginLink>

            <span className="text-xs text-muted-foreground">
              No credit card required. Free while in beta.
            </span>
          </div>
        </div>
      </section>

      {/* LARGE WIDE IMAGE */}
      <section className="bg-slate-50/60 dark:bg-slate-950 ">
        <div className="w-full max-w-7xl mx-auto px-0 lg:px-4 pb-12 lg:pb-16">
          <div className="rounded-2xl border bg-background shadow-2xl overflow-hidden">
            <Image
              src={LandingHero}
              alt="worksRecorded hero preview"
              priority
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2 – What problems we solve */}
      <section className="bg-background">
        <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-12 lg:py-16 grid gap-10 lg:grid-cols-2 items-center">
          <div className="order-2 lg:order-1">
            <WhatDoWeDo />
          </div>
          <div className="order-1 lg:order-2">
            <div className="rounded-2xl border bg-background shadow-xl overflow-hidden">
              <Image
                src={Dashboard2}
                alt="Project records and analytics in worksRecorded"
                priority
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 – How we help + why different */}
      <section className="bg-slate-50/60 dark:bg-slate-950 ">
        <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-12 lg:py-16 grid gap-12 lg:grid-cols-2">
          <div>
            <HowDoWeDoThat />
          </div>
          <div>
            <Why />
          </div>
        </div>
      </section>

      {/* Existing features section */}
      <Features />
    </>
  );
}
