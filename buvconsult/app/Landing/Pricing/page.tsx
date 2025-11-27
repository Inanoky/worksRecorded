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
            Transparent monthly pricing per project, designed to scale with your project's size and complexity. No long-term contracts, no setup fees.
          </p>
        </div>

        {/* --- Main content FIX: Removed 'md:col-start-2' and 'md:grid-cols-3' centering classes --- */}
        {/* We now use a single column ('grid-cols-1') for the main content area */}
        <div className="mt-12 md:mt-16 grid grid-cols-1 gap-8 lg:gap-12"> 
          
          {/* Main Subscription Card - Now it will take the full width of the parent grid */}
          <div className="max-w-3xl mx-auto w-full space-y-8"> {/* Added max-w-3xl and mx-auto to re-center and limit width, but much wider than before */}
            {/* Subscription Tiers Card */}
            <div className="relative rounded-3xl border-2 border-primary bg-card text-card-foreground shadow-xl p-6 sm:p-8 lg:p-10 transition-all duration-300 hover:shadow-2xl">
              
              {/* Highlight Tag */}
              <div className="absolute top-0 right-0 -mt-3 -mr-3 flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground transform rotate-6">
                <Star className="h-4 w-4 fill-white text-white" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center justify-between">
                <span>Project Subscriptions</span>
              </h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Pricing is based on project size, reflecting the typical volume of site communication, records, and documents.
              </p>

              {/* Tiers List - Enhanced Visuals for Pricing */}
              <div className="space-y-6">
                {/* Tier 1 */}
                <div className="border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-lg">Up to 1M EUR</p>
                      <p className="text-muted-foreground text-sm">
                        Smaller or single-discipline contracts.
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="font-extrabold text-2xl whitespace-nowrap text-primary">10&nbsp;EUR</p>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>
                  </div>
                </div>

                {/* Tier 2 */}
                <div className="border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-lg">Up to 5M EUR</p>
                      <p className="text-muted-foreground text-sm">
                        Mid-size projects with several trades involved.
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="font-extrabold text-2xl whitespace-nowrap text-primary">15&nbsp;EUR</p>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>
                  </div>
                </div>

                {/* Tier 3 */}
                <div className="border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-lg">Up to 10M EUR</p>
                      <p className="text-muted-foreground text-sm">
                        Larger sites with higher data volume.
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="font-extrabold text-2xl whitespace-nowrap text-primary">20&nbsp;EUR</p>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* General Features List - Highlighting value */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-3">All plans include:</h3>
                <ul className="space-y-2">
                    <PricingFeature>Unlimited team members</PricingFeature>
                    <PricingFeature>Full platform access</PricingFeature>
                    <PricingFeature>Dedicated cloud storage</PricingFeature>
                    <PricingFeature>Email & phone support</PricingFeature>
                </ul>
              </div>

              {/* Call to Action */}
              <div className="mt-8">
                <Link href="/api/auth/register" className="w-full">
                  <Button size="lg" className="w-full">
                    Start Your 14-Day Free Trial
                  </Button>
                </Link>
                <div className="text-center mt-3 text-xs text-muted-foreground">
                  Cancel any time. Pricing shown without VAT.
                </div>
              </div>
            </div>

            {/* Custom solutions Card - Now it will also take the new, wider width */}
            <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-6 sm:p-8 lg:p-10 space-y-5">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                Enterprise & Custom Solutions
              </h2>
              
              <div className="space-y-4 text-base">
                <p className="text-muted-foreground">
                  For projects **above 10&nbsp;M&nbsp;EUR** or portfolio-wide deployments, we offer tailored pricing. We can also adapt our platform and data workflows to your specific processes, cost codes, and reporting requirements.
                </p>
                <p className="text-muted-foreground">
                  Because we focus only on construction, we quickly understand your needs and can translate project controls into a practical, custom digital setup.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <a href="mailto:hello@buvconsult.com">
                  <Button variant="outline" size="lg">
                    Schedule a Consultation
                  </Button>
                </a>
                <span className="text-xs text-muted-foreground self-center">
                  Free initial consultation.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}