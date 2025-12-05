// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\components\landing\Landing\LandingPageDesktop.tsx

"use client";

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
  HowDoWeDoThat,
  SmallDescription,
  WhatDoWeDo,
  Why,
} from "@/components/landing/Landing/Text";

export default function LandingPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative flex justify-center bg-slate-50/60 dark:bg-slate-950 border-b">
        <div className="w-full max-w-6xl px-4 lg:px-6 py-12 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
            {/* Left: copy */}
            <div>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-xs font-medium text-primary tracking-tight">
                Built for trade contractors &amp; site managers
              </span>

              <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-semibold leading-tight">
                {Header}
                <span className="block text-primary mt-1">{Header2}</span>
              </h1>

              <p className="mt-4 max-w-xl text-base lg:text-lg text-muted-foreground">
                {SmallDescription}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
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

              <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
                <p>
                  • Works with WhatsApp, voice notes, photos and email — no new
                  app for the site team.
                </p>
                <p>• Site diary, documents and evidence are ready when you need them.</p>
              </div>
            </div>

            {/* Right: hero image */}
            <div className="relative">
              <div className="rounded-2xl border bg-background shadow-2xl overflow-hidden">
                <Image
                  src={Dashboard}
                  alt="Buvconsult dashboard preview"
                  priority
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
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
                alt="Project records and analytics"
                priority
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 – How we help + why different */}
      <section className="bg-slate-50/60 dark:bg-slate-950 border-y">
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
