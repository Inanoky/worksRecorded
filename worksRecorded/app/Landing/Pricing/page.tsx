// app/(marketing)/pricing/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";

const PricingFeature = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start space-x-2">
    <Check className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" />
    <span className="text-base">{children}</span>
  </li>
);

export default function Page() {
  return (
    <section className="relative flex items-center justify-center bg-slate-50/60 dark:bg-slate-950">
      <div className="w-full mx-auto max-w-5xl px-4 sm:px-6 py-12 lg:py-24">
        {/* Heading */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="mt-4 sm:mt-6 text-4xl sm:text-6xl md:text-7xl font-extrabold leading-tight tracking-tighter">
            Pricing Built for <span className="text-primary">Construction</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Transparent monthly pricing per project, designed to scale with your project's size and complexity. Contact for more custom qoute. 
          </p>
        </div>

        {/* --- Main content FIX: Removed 'md:col-start-2' and 'md:grid-cols-3' centering classes --- */}
        {/* We now use a single column ('grid-cols-1') for the main content area */}
        <div className="mt-12 md:mt-16 grid grid-cols-1 gap-8 lg:gap-12"> 
          
          {/* Main Subscription Card - Now it will take the full width of the parent grid */}
       
        </div>
      </div>
    </section>
  );
}