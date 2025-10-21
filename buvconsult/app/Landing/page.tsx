// app/(marketing)/page.tsx — Mobile-first, responsive landing page

import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/buvconsultLogo.svg";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import HeroImage from "@/public/hero.png";
import Dashboard from "@/public/frontend/pages/Home/Dashboard.png";
import Dashboard2 from "@/public/frontend/pages/Home/Dashboard2.png";
import { NavigationMenuDemo } from "./NavigationBar";
import { Features } from "@/components/landing/Features";

export default function LandingPage() {
  return (
    <>
      <section className="relative flex items-center justify-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-20">
          {/* Hero */}
          <div className="text-center">
            <span className="inline-block text-xs sm:text-sm text-primary font-medium tracking-tight bg-primary/10 px-3 sm:px-4 py-1.5 rounded-full">
              Construction Project management solution
            </span>

            <h1 className="mt-6 sm:mt-8 text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight sm:leading-none">
              Passive construction data collection
              <span className="block text-primary">It&apos;s in the data</span>
            </h1>

            <p className="max-w-2xl mx-auto mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg font-light text-muted-foreground tracking-tight">
              Do you want to always know why your project stands where it does in terms of time, budget, and quality?
              The answer lies in your construction data. Collecting and analyzing this data can be costly — we help you
              automate the process without overloading your management.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto justify-center">
              <LoginLink>
                <Button variant="secondary" className="w-full sm:w-auto">Sign in</Button>
              </LoginLink>
              <RegisterLink>
                <Button className="w-full sm:w-auto">Try for free</Button>
              </RegisterLink>
            </div>
          </div>

          {/* Block 1 */}
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
              <p className="text-base sm:text-lg md:text-xl leading-relaxed">
                <span className="block text-xl sm:text-2xl font-semibold">What do we do</span>
                <span className="block h-3 sm:h-4" />
                We collect all data from your construction projects — invoices, site diary records, timesheets, documents, and more.
                The BUVCONSULT engine structures your data and gives you real-time insights into what’s happening on your project.
                <span className="block h-3 sm:h-4" />
                <span className="font-bold">No integrations. No lengthy training. Get ready in minutes.</span>
              </p>
            </div>
          </div>

          {/* Block 2 */}
          <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center">
            <div className="order-2 md:order-none">
              <p className="text-base sm:text-lg md:text-xl leading-relaxed">
                <span className="block text-xl sm:text-2xl font-semibold">Benefits</span>
                <span className="block h-3 sm:h-4" />
                <ul className="list-disc pl-5 sm:pl-6 space-y-2 marker:text-primary marker:text-base sm:marker:text-lg">
                  <li>Complete records of your project in one place.</li>
                  <li>Saved management time.</li>
                  <li>Detailed cost breakdown — labor, materials, and machinery.</li>
                  <li>Leverage AI advancements for the construction industry.</li>
                </ul>
              </p>
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
        </div>
      </section>

      <Features />
    </>
  );
}
