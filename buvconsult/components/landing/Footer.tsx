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

export function Footer() {
  return (
    <>
      <div className="grid grid-cols-4 p-15 gap-5">
        <div className="space-y-6 mt-6 text-base leading-snug">
          <p>SIA "BUVCONSULT"</p>

          <div className="text-muted-foreground space-y-2">
            <p>LV40203643527, 23.04.2025</p>
            <p>Rīga, Brīvības iela 91–22, LV-1001</p>
            <p>
              <a href="https://www.buvconsult.com" className="underline">
                buvconsult.com
              </a>
            </p>
            <p>All rights reserved</p>
          </div>
        </div>

        <div className="space-y-4 mt-6 text-base leading-snug">
          <h1>Data</h1>

          <p>
            <Link href="/Landing/SiteDiary" className="underline text-muted-foreground">
              Site diary
            </Link>
          </p>
          <p>
            <Link href="/Landing/Invoices" className="underline text-muted-foreground">
              Invoices
            </Link>
          </p>
          <p>
            <Link href="/Landing/Documents" className="underline text-muted-foreground">
              Documents
            </Link>
          </p>
          <p>
            <Link href="/Landing/Timesheets" className="underline text-muted-foreground">
              Timesheets
            </Link>
          </p>
          <p>
            <Link href="/Landing/Analytics"className="underline text-muted-foreground">
              Analytics
            </Link>
          </p>
        </div>

        <div className="space-y-4 mt-6 text-base leading-snug">
          <p>Features</p>
          <div className="space-y-4 text-muted-foreground">
            <p>
              <Link href="/Landing/Custom"className="underline">
                Custom Digital Solution
              </Link>
            </p>
            <p>
              <Link href="/Landing/Pricing" className="underline">
                Pricing
              </Link>
            </p>
            <p>
              <Link href="/Landing/About" className="underline">
                About
              </Link>
            </p>
          </div>
        </div>

        <div className="justify-center">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <CardDescription>
                <h4 className="text-3xl">
                  Buv<span className="text-primary">consult</span>
                </h4>
              </CardDescription>
              <CardAction>Contact us anytime!</CardAction>
            </CardHeader>
            <CardContent>
              <p>
                <a href="tel:+37124885690">tel. +371 24885690</a>
              </p>
            </CardContent>
            <CardFooter>
              <p>
                <a href="mailto:hello@buvconsult.com">hello@buvconsult.com</a>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
