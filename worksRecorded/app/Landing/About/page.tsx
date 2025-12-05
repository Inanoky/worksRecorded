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
        <div className="w-full  mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <div className="text-center">
            <h1 className="mt-8 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-medium leading-tight sm:leading-none">
              About
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-start w-full py-12 mx-auto mt-12">
            <div className="md:col-span-2 text-base sm:text-lg md:text-xl leading-relaxed space-y-5">
              <p>
                The construction industry is notorious worldwide for delays and cost overruns. Why? At BUVCONSULT we
                believe the answer is in the data. Poor record-keeping and overloaded management make it hard for the
                industry to learn from mistakes.
              </p>
              <p>
                Why hasn’t it been solved before? Because of industry specifics such as “lowest bid wins,” low priority
                on data, lack of reliable technology to collect and structure it, and limited data-science capabilities
                to extract meaningful insights.
              </p>
              <p>
                We are a Latvian SaaS platform focused on fixing exactly that. We deliver high-quality data collection
                and analytics—affordably—for the companies that need it most: small and medium trade contractors.
              </p>
              <div className="space-y-1">
                <p>Vjaceslavs Gromatovičs</p>
                <p>BUVCONSULT Team</p>
                <p>From construction professionals, for construction professionals.</p>
              </div>
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

          {/* Reserved block if needed later */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 w-full py-12 mx-auto mt-12" />
        </div>
      </section>
    </>
  );
}
