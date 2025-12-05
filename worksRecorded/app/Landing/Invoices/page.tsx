// app/(marketing)/invoices/page.tsx — Mobile-first; desktop layout preserved

import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/buvconsultLogo.svg";

import InvoicesPage from "@/public/frontend/pages/Invoices/InvoicesPage.png";
import Invoices2 from "@/public/frontend/pages/Invoices/Invoices2.png";
import { NavigationMenuDemo } from "@/components/landing/NavigationMenuDesktop";

export default function Page() {
  return (
    <>
      <section className="p-5 relative flex items-center justify-center">
        <div className="w-full  mx-auto px-4 sm:px-6 py-10 lg:py-20">
          <div className="text-center">
            <h1 className="mt-4 sm:mt-8 text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-medium leading-tight sm:leading-none">
              Invoices
            </h1>
          </div>

          {/* Block 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-10 mx-auto mt-6 md:mt-12">
            <Image
              src={InvoicesPage}
              alt="Invoices dashboard"
              priority
              className="md:col-span-2 w-full object-cover border rounded-xl lg:rounded-2xl shadow-2xl"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
            />

            <div className="text-base sm:text-lg md:text-xl leading-relaxed text-center md:text-left">
              <span className="block text-xl sm:text-2xl font-semibold">How do we do that</span>
              <span className="block h-3 sm:h-4" />
              Add <span className="font-mono">invoices@buvconsult.com</span> to your existing invoice flow. We’ll receive a
              copy of your invoices, and the BUVCONSULT AI will digitize and store them in a structured way.
            </div>
          </div>

          {/* Block 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 items-center w-full py-10 mx-auto mt-6 md:mt-12">
            <div className="flex flex-col text-base sm:text-lg md:text-xl leading-relaxed text-center md:text-left">
              <span className="text-xl sm:text-2xl font-semibold">What is your benefit</span>
              <span className="block h-3 sm:h-4" />
              <p>
                Get a <span className="text-primary font-bold">detailed cost breakdown</span> for every invoice item.
                Categorize in seconds. Need to change cost codes or summarize? AI will parse through thousands of invoice
                items to present detailed insights into your costs.
              </p>
            </div>

            <Image
              src={Invoices2}
              alt="Invoice analytics"
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
