// 10:11 - Landing page (Custom digital solutions)

import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/buvconsultLogo.svg";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import InvoicesPage from "@/public/frontend/pages/Invoices/InvoicesPage.png";
import { NavigationMenuDemo } from "@/components/landing/NavigationMenuDesktop";
import Development from "@/public/frontend/pages/CustomSolutions/Development.png";
import Site from "@/public/frontend/pages/CustomSolutions/Site.jpeg";

export default function Page() {
  return (
    <>
      <section className="relative flex items-center justify-center">
        <div className="w-full  mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <div className="text-center">
            <h1 className="mt-8 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-medium leading-tight sm:leading-none">
              Custom digital solutions
            </h1>
          </div>

          {/* Block 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-12 mx-auto mt-12">
            <Image
              src={Site}
              alt="On-site digital solutions"
              priority
              className="md:col-span-2 w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl"
              
            />

            <div className="text-base sm:text-lg md:text-xl leading-relaxed space-y-4 text-center md:text-left">
              <span className="block text-xl sm:text-2xl font-semibold">How do we do that</span>
              <p>
                We speak <span className="text-primary font-semibold">construction language</span>. We dive into your
                processes, map where value is created, and identify what data to capture and how you’ll benefit from it.
              </p>
              <p>
                Once a custom system is designed and implemented, it keeps paying off—clean records, less manual work,
                and analytics that support decisions.
              </p>
              <p>
                Email us the process you want to digitalize and automate, and we’ll propose an effective, pragmatic
                solution.
              </p>
            </div>
          </div>

          {/* Block 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-12 mx-auto mt-12">
            <div className="flex flex-col text-base sm:text-lg md:text-xl leading-relaxed space-y-4 text-center md:text-left">
              <span className="text-xl sm:text-2xl font-semibold">What is your benefit</span>
              <p>
                Construction is one of the last under-digitalized frontiers. Get ahead and leverage the AI wave to
                improve margins, bids, and day-to-day processes.
              </p>
              <p>
                From construction professionals to construction professionals. Practical tools, minimal friction, real
                outcomes.
              </p>
            </div>

            <Image
              src={Development}
              alt="Custom development"
              priority
              className="md:col-span-2 w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl"
             
            />
          </div>
        </div>
      </section>
    </>
  );
}
