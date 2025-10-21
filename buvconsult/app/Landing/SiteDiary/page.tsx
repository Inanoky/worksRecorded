// app/(marketing)/site-diary/page.tsx — Mobile-first; desktop layout unchanged

import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/buvconsultLogo.svg";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import HeroImage from "@/public/hero.png";
import { NavigationMenuDemo } from "@/components/landing/NavigationMenuDesktop";
import SiteDiary1 from "@/public/frontend/pages/SiteDiary/SiteDiary1.png";
import SiteDiary2 from "@/public/frontend/pages/SiteDiary/SiteDiary2.png";
import WhatsappScreen from "@/public/frontend/pages/SiteDiary/WhatsappScreen.png";

export default function Page() {
  return (
    <>
      <section className="p-5 relative flex items-center justify-center">
        <div className="w-full mx-auto px-4 sm:px-6 py-10 lg:py-20">
          <div className="text-center">
            <h1 className="mt-4 sm:mt-8 text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-medium leading-tight sm:leading-none">
              Construction site records
            </h1>
          </div>

          {/* Block 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-10 mx-auto mt-6 md:mt-12">
            <div className="relative md:col-span-2">
              <Image
                src={SiteDiary2}
                alt="Site diary"
                priority
                className="w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl shadow-black/40"
               
              />

              {/* Overlay phone — keep desktop sizing the same, make mobile friendlier */}
              <Image
                src={WhatsappScreen}
                alt="WhatsApp"
                priority
                width={280}
                height={560}
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
              Just send a voice message to BUVCONSULT WhatsApp describing what happened today. Our AI will transform
              your words into a structured site diary record.
            </p>
          </div>

          {/* Block 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-10 mx-auto mt-6 md:mt-12">
            <div className="space-y-3 sm:space-y-4 flex flex-col text-base sm:text-lg md:text-xl leading-relaxed text-center md:text-left">
              <span className="text-xl sm:text-2xl font-semibold">What is your benefit</span>
              <p>Everything that happens on site during the project is stored and easily accessible.</p>
              <p>
                Claim? You have <span className="text-primary font-bold">proof to defend.</span>
              </p>
              <p>
                Loss? You have <span className="text-primary font-bold">proof to recover.</span>
              </p>
              <p>Estimation? You know exactly how much time you’ve spent.</p>
              <p>Your project recorded.</p>
            </div>

            <Image
              src={SiteDiary1}
              alt="Site diary gallery"
              priority
              className="md:col-span-2 w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl shadow-black/40"
             
            />
          </div>
        </div>
      </section>
    </>
  );
}
