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

export default function FooterDesktop() {
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
    <>
      <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 sm:p-10 lg:grid-cols-4">
        <div className="mt-2 space-y-6 text-base leading-snug sm:mt-6">
          <p>WorksRecorded</p>

          <div className="text-muted-foreground space-y-2">
            <p>LV40203643527, 23.04.2025</p>
            <p>Rīga, Brīvības iela 91–22, LV-1001</p>
            <p>
              <a href="https://www.worksrecorded.com" className="underline">
                worksrecorded.com
              </a>
            </p>
            <p>{labels.rights}</p>
          </div>
        </div>

        <div className="mt-2 space-y-4 text-base leading-snug sm:mt-6">
          <h1>{labels.data}</h1>

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

        <div className="mt-2 space-y-4 text-base leading-snug sm:mt-6">
          <p>{labels.features}</p>
          <div className="space-y-4 text-muted-foreground">
            <p>
              <Link href={`/${locale}/Landing/Custom`} className="underline">
                {labels.custom}
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/Pricing`} className="underline">
                {labels.pricing}
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/About`} className="underline">
                {labels.about}
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/Privacy`} className="underline">
                {labels.privacy}
              </Link>
            </p>
          </div>
        </div>

        <div className="justify-center">
          <Card className="h-full min-w-0">
            <CardHeader className="space-y-2">
              <CardTitle>{labels.contact}</CardTitle>
              <CardDescription>
                <h4 className="text-2xl sm:text-3xl">
                  Works<span className="text-primary">Recorded</span>
                </h4>
              </CardDescription>
              <p className="text-sm leading-snug text-muted-foreground">{labels.contactHelp}</p>
            </CardHeader>
            <CardContent>
              <p className="min-w-0">
                <a
                  href="tel:+37124885690"
                  className="inline-block max-w-full break-words underline underline-offset-4"
                >
                  {labels.phone}
                </a>
              </p>
            </CardContent>
            <CardFooter>
              <p className="min-w-0">
                <a
                  href="mailto:vjaceslavs@worksrecorded.com"
                  className="inline-block max-w-full break-all text-sm underline underline-offset-4 sm:text-base"
                >
                  vjaceslavs@worksrecorded.com
                </a>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
