// components/landing/Footer.tsx — Mobile-first responsive footer

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";

export default function FooterMobile() {
  return (
    <footer className="border-t">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
          {/* Company */}
        
          {/* Data */}
   

          {/* Features */}
      

          {/* Contact card */}
          <div>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle>Contact</CardTitle>
                <CardDescription>
                  <h4 className="text-2xl sm:text-3xl">
                    Buv<span className="text-primary">consult</span>
                  </h4>
                </CardDescription>
                <CardAction>Contact us anytime!</CardAction>
              </CardHeader>
              <CardContent className="pt-2 text-sm sm:text-base">
                <p>
                  <a href="tel:+37124885690" className="underline underline-offset-4">
                    tel. +371 24885690
                  </a>
                </p>
              </CardContent>
              <CardFooter className="text-sm sm:text-base">
                <p>
                  <a href="mailto:hello@buvconsult.com" className="underline underline-offset-4">
                    hello@buvconsult.com
                  </a>
                </p>
              </CardFooter>
            </Card>
          </div>

            <div className="space-y-4">
            <p className="text-sm sm:text-base font-medium">SIA &quot;BUVCONSULT&quot;</p>
            <div className="text-muted-foreground space-y-1 text-sm sm:text-base leading-relaxed">
              <p>LV40203643527, 23.04.2025</p>
              <p>Rīga, Brīvības iela 91–22, LV-1001</p>
              <p>
                <a href="https://www.buvconsult.com" className="underline underline-offset-4">
                  buvconsult.com
                </a>
              </p>
              <p>All rights reserved</p>
            </div>
          </div>

        </div>

        {/* Bottom bar (optional) */}
        <div className="mt-8 border-t pt-6 text-center text-xs sm:text-sm text-muted-foreground">
          © {new Date().getFullYear()} BUVCONSULT
        </div>
      </div>
    </footer>
  );
}
