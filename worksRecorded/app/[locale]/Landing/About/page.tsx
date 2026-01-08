// 10:11 - Landing page (About)

import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/buvconsultLogo.svg";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import InvoicesPage from "@/public/frontend/pages/Invoices/InvoicesPage.png";
import { NavigationMenuDemo } from "@/components/landing/NavigationMenuDesktop";
import Selfie from "@/public/frontend/pages/About/Selfie.jpg";

export default function Page() {
  return (
    <>
      <section className="relative flex items-center justify-center">
        <div className="w-full mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <div className="text-center">
            <h1 className="mt-8 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-medium leading-tight sm:leading-none">
              About
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-start w-full py-12 mx-auto mt-12">
            <div className="md:col-span-2 text-base sm:text-lg md:text-xl leading-relaxed space-y-5">
              <p>
                Do you knows what is happening on your construction site? Tracking construction works is not easy.
              </p>

              <p>
                Site managment often overloaded and reluctant to take up additional admin burden to keep records
              </p>

              <p>
                Even if exist, records are often scattered, unorganized and need large effort to be sorted to become usefull.
              </p>

              <p>
                When records are missing, it is hard to improve processes, track metrics, argument claims/additional works,
                account for lost time or just generally understand why things are where they are.
              </p>

              <p>
                Current digital tools are complex, take time and effort to integrate and often met with resistance from
                overloaded site teams.
              </p>

              <p>
                To help I created a small tool called <strong>WorksRecorded.com</strong>
              </p>

              <p>
                Site manager uses WhatsApp to take a voice/text notes of site activities. System then automatically sorts
                and stores records, which can be viewed from browser.
              </p>

              <p>
                This allows site managment to spend more times on site, overseeing works and less time in office doing admin.
              </p>

              <p>
                Simultaniously this also lets project management better understand the project so they can analyze, act,
                and argue their position confidently to the GC/Client.
              </p>

              <p>
                I have used this tool myself and find it simply yet powerfull during complicated construction projects.
              </p>

              <p>
                I will be happy if it will help you too, it is free for 1 project everyone while in beta and I will be happy
                to discuss and help if you have any quesiton.
              </p>
            </div>

            <div className="flex justify-center md:justify-end">
              <Image
                src={Selfie}
                alt="Vjaceslavs Gromatovičs"
                priority
                width={350}
                height={200}
                className="h-auto w-[70%] sm:w-[60%] md:w-[350px] rounded-2xl border shadow-2xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 w-full py-12 mx-auto mt-12" />
        </div>
      </section>
    </>
  );
}
