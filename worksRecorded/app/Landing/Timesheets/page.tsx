// app/(marketing)/timesheets/page.tsx — Mobile-first; desktop layout preserved

import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/buvconsultLogo.svg";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import InvoicesPage from "@/public/frontend/pages/Invoices/InvoicesPage.png";
import { NavigationMenuDemo } from "@/components/landing/NavigationMenuDesktop";
import Timesheets1 from "@/public/frontend/pages/Timesheets/Timesheets1.png";
import TimesheetsWhatsapp from "@/public/frontend/pages/Timesheets/TimesheetsWhatsapp.png";

export default function Page() {
  return (
    <>
      <section className="p-5 relative flex items-center justify-center">
        <div className="w-full  mx-auto px-4 sm:px-6 py-10 lg:py-20">
          <div className="text-center">
            <h1 className="mt-4 sm:mt-8 text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-medium leading-tight sm:leading-none">
              Timesheets
            </h1>
          </div>

          {/* Block 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-10 mx-auto mt-6 md:mt-12">
            <div className="relative md:col-span-2">
              <Image
                src={Timesheets1}
                alt="Timesheets dashboard"
                priority
                className="w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl shadow-black/40"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
              />

              {/* Phone overlay — keep md+ same width; make mobile slightly larger for clarity */}
              <Image
                src={TimesheetsWhatsapp}
                alt="WhatsApp"
                priority
                className="
                  absolute bottom-3 right-3
                  rounded-xl shadow-xl border z-10
                  w-[32%] aspect-[1/2.1679]
                  sm:w-[28%]
                  md:w-[23.3%] md:bottom-4 md:right-4
                "
              />
            </div>

            <p className="text-base sm:text-lg md:text-xl leading-relaxed text-center md:text-left">
              <span className="block text-xl sm:text-2xl font-semibold">How do we do that</span>
              <span className="block h-3 sm:h-4" />
              Workers use WhatsApp to chat with BUVCONSULT AI to clock in and out of work. Before clocking out, the AI
              asks them to describe what was achieved during the day. The information is structured and stored in the
              database automatically.
            </p>
          </div>

          {/* Block 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-10 mx-auto mt-6 md:mt-12">
            <div className="flex flex-col text-base sm:text-lg md:text-xl leading-relaxed text-center md:text-left">
              <span className="text-xl sm:text-2xl font-semibold">What is your benefit</span>
              <span className="block h-3 sm:h-4" />
              <ul className="list-disc pl-5 sm:pl-6 space-y-2 marker:text-primary marker:text-base sm:marker:text-lg">
                <li>Get every work hour accounted for.</li>
                <li>Bid labor precisely on the next project.</li>
                <li>Identify waste, set targets, and measure KPIs for labor.</li>
              </ul>
            </div>

            <Image
              src={InvoicesPage}
              alt="Timesheet analytics"
              priority
              className="md:col-span-2 w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl shadow-black/20"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
            />
          </div>
        </div>
      </section>
    </>
  );
}
