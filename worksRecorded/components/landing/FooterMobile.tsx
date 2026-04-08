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
import { useLocale } from "next-intl";

export default function FooterMobile() {
  const locale = useLocale();

  return (
    <footer className="border-t">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
          <div className="space-y-3 text-sm sm:text-base">
            <p className="font-medium">Data</p>
            <p>
              <Link href={`/${locale}/Landing/SiteDiary`} className="underline text-muted-foreground">
                Site diary
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/Timesheets`} className="underline text-muted-foreground">
                Timesheets
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/Analytics`} className="underline text-muted-foreground">
                Analytics
              </Link>
            </p>
          </div>

          <div className="space-y-3 text-sm sm:text-base">
            <p className="font-medium">Features</p>
            <p>
              <Link href={`/${locale}/Landing/Custom`} className="underline text-muted-foreground">
                Custom Digital Solutions
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/Pricing`} className="underline text-muted-foreground">
                Pricing
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/About`} className="underline text-muted-foreground">
                About
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/Privacy`} className="underline text-muted-foreground">
                Privacy Policy
              </Link>
            </p>
          </div>

          <div>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle>Contact</CardTitle>
                <CardDescription>
                  <h4 className="text-2xl sm:text-3xl">
                    Works<span className="text-primary">Recorded</span>
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
                  <a href="mailto:vjaceslavs@worksrecorded.com">vjaceslavs@worksrecorded.com</a>
                </p>
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-4">
            <p className="text-sm sm:text-base font-medium"> &quot;WorksRecorded&quot;</p>
            <div className="text-muted-foreground space-y-1 text-sm sm:text-base leading-relaxed">
              <p>LV40203643527, 23.04.2025</p>
              <p>Rīga, Brīvības iela 91–22, LV-1001</p>
              <p>
                <a href="https://www.buvconsult.com" className="underline underline-offset-4">
                  buvconsult.com
                </a>
              </p>
              <p>All rights reserved. WorksRecorded is a product of Buvconsult SIA, Latvia</p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-xs sm:text-sm text-muted-foreground">
          © {new Date().getFullYear()} BUVCONSULT
        </div>
      </div>
    </footer>
  );
}
