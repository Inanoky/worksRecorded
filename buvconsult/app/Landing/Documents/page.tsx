// app/(marketing)/documents/page.tsx — Mobile-first; desktop layout preserved

import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/buvconsultLogo.svg";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import InvoicesPage from "@/public/frontend/pages/Invoices/InvoicesPage.png";
import { NavigationMenuDemo } from "@/components/landing/NavigationMenuDesktop";
import Documents1 from "@/public/frontend/pages/Documents/Documents1.png";

export default function Page() {
  return (
    <>
      <section className="p-5 relative flex items-center justify-center">
        <div className="w-full mx-auto px-4 sm:px-6 py-10 lg:py-20">
          <div className="text-center">
            <h1 className="mt-4 sm:mt-8 text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-medium leading-tight sm:leading-none">
              Documents
            </h1>
          </div>

          {/* Block 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-10 mx-auto mt-6 md:mt-12">
            <Image
              src={Documents1}
              alt="Documents dashboard"
              priority
              className="md:col-span-2 w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
            />

            <div className="text-base sm:text-lg md:text-xl leading-relaxed text-center md:text-left">
              <span className="block text-xl sm:text-2xl font-semibold">How do we do that</span>
              <span className="block h-3 sm:h-4" />
              Upload your documents in bulk. AI will extract information and provide it as context for analytics.
            </div>
          </div>

          {/* Block 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-10 mx-auto mt-6 md:mt-12">
            <div className="flex flex-col text-base sm:text-lg md:text-xl leading-relaxed text-center md:text-left">
              <span className="text-xl sm:text-2xl font-semibold">What is your benefit</span>
              <span className="block h-3 sm:h-4" />
              <p>
                Get cross-referencing between invoices, site records, and quality documents. Ask AI to perform an
                informed analysis on project-specific topics. <span className="text-primary font-bold">Talk to your project.</span>
              </p>
            </div>

            <Image
              src={InvoicesPage}
              alt="Cross-referenced analytics"
              priority
              className="md:col-span-2 w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
            />
          </div>
        </div>
      </section>
    </>
  );
}
