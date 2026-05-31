// components/landing/Footer.tsx — Mobile-first responsive footer

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useLocale } from "next-intl";

export default function FooterMobile() {
  const locale = useLocale();
  const isLatvian = locale === "lv";
  const labels = {
    data: isLatvian ? "Dati" : "Data",
    siteDiary: isLatvian ? "Būvdarbu žurnāls" : "Site diary",
    timesheets: isLatvian ? "Darba laika uzskaite" : "Timesheets",
    analytics: isLatvian ? "Analītika" : "Analytics",
    features: isLatvian ? "Iespējas" : "Features",
    custom: isLatvian ? "Pielāgoti digitālie risinājumi" : "Custom Digital Solutions",
    pricing: isLatvian ? "Cenas" : "Pricing",
    about: isLatvian ? "Par mums" : "About",
    privacy: isLatvian ? "Privātuma politika" : "Privacy Policy",
    contact: isLatvian ? "Kontakti" : "Contact",
    contactHelp: isLatvian ? "Sazinieties par demo vai jautājumiem." : "Contact us anytime!",
    phone: isLatvian ? "tālr. +371 24885690" : "tel. +371 24885690",
    rights: isLatvian
      ? "Visas tiesības aizsargātas. WorksRecorded ir Buvconsult SIA produkts, Latvija"
      : "All rights reserved. WorksRecorded is a product of Buvconsult SIA, Latvia",
  };

  return (
    <footer className="border-t">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
          <div className="space-y-3 text-sm sm:text-base">
            <p className="font-medium">{labels.data}</p>
            <p>
              <Link href={`/${locale}/Landing/SiteDiary`} className="underline text-muted-foreground">
                {labels.siteDiary}
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/Timesheets`} className="underline text-muted-foreground">
                {labels.timesheets}
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/Analytics`} className="underline text-muted-foreground">
                {labels.analytics}
              </Link>
            </p>
          </div>

          <div className="space-y-3 text-sm sm:text-base">
            <p className="font-medium">{labels.features}</p>
            <p>
              <Link href={`/${locale}/Landing/Custom`} className="underline text-muted-foreground">
                {labels.custom}
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/Pricing`} className="underline text-muted-foreground">
                {labels.pricing}
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/About`} className="underline text-muted-foreground">
                {labels.about}
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/Privacy`} className="underline text-muted-foreground">
                {labels.privacy}
              </Link>
            </p>
          </div>

          <div>
            <Card className="h-full min-w-0">
              <CardHeader className="pb-2">
                <CardTitle>{labels.contact}</CardTitle>
                <CardDescription>
                  <h4 className="text-2xl sm:text-3xl">
                    Works<span className="text-primary">Recorded</span>
                  </h4>
                </CardDescription>
                <p className="text-sm leading-snug text-muted-foreground">{labels.contactHelp}</p>
              </CardHeader>
              <CardContent className="pt-2 text-sm sm:text-base">
                <p className="min-w-0">
                  <a
                    href="tel:+37124885690"
                    className="inline-block max-w-full break-words underline underline-offset-4"
                  >
                    {labels.phone}
                  </a>
                </p>
              </CardContent>
              <CardFooter className="text-sm sm:text-base">
                <p className="min-w-0">
                  <a
                    href="mailto:vjaceslavs@worksrecorded.com"
                    className="inline-block max-w-full break-all underline underline-offset-4"
                  >
                    vjaceslavs@worksrecorded.com
                  </a>
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
              <p>{labels.rights}</p>
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
