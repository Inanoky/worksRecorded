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

export default function FooterDesktop() {
  const locale = useLocale();

  return (
    <>
      <div className="grid grid-cols-4 p-15 gap-5">
        <div className="space-y-6 mt-6 text-base leading-snug">
          <p>WorksRecorded</p>

          <div className="text-muted-foreground space-y-2">
            <p>LV40203643527, 23.04.2025</p>
            <p>Rīga, Brīvības iela 91–22, LV-1001</p>
            <p>
              <a href="https://www.worksrecorded.com" className="underline">
                worksrecorded.com
              </a>
            </p>
            <p>All rights reserved. WorksRecorded is a product of Buvconsult SIA, Latvia</p>
          </div>
        </div>

        <div className="space-y-4 mt-6 text-base leading-snug">
          <h1>Data</h1>

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

        <div className="space-y-4 mt-6 text-base leading-snug">
          <p>Features</p>
          <div className="space-y-4 text-muted-foreground">
            <p>
              <Link href={`/${locale}/Landing/Custom`} className="underline">
                Custom Digital Solutions
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/Pricing`} className="underline">
                Pricing
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/About`} className="underline">
                About
              </Link>
            </p>
            <p>
              <Link href={`/${locale}/Landing/Privacy`} className="underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>

        <div className="justify-center">
          <Card className="h-full min-w-0">
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <CardDescription>
                <h4 className="text-3xl">
                  Works<span className="text-primary">Recorded</span>
                </h4>
              </CardDescription>
              <CardAction className="text-sm leading-snug">Contact us anytime!</CardAction>
            </CardHeader>
            <CardContent>
              <p className="min-w-0">
                <a
                  href="tel:+37124885690"
                  className="inline-block max-w-full break-words underline underline-offset-4"
                >
                  tel. +371 24885690
                </a>
              </p>
            </CardContent>
            <CardFooter>
              <p className="min-w-0">
                <a
                  href="mailto:vjaceslavs@worksrecorded.com"
                  className="inline-block max-w-full break-all text-sm sm:text-base underline underline-offset-4"
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
