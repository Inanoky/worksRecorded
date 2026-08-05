import {NextIntlClientProvider} from "next-intl";
import {getMessages} from "next-intl/server";
import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {buildLandingMetadata} from "@/lib/seo/landingMetadata";

const locales = ["en", "lv", "ru"] as const;

export async function generateMetadata({
  params
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;

  return buildLandingMetadata({
    locale,
    path: "/Landing",
    title: "Construction Site Records and Cost Control | WorksRecorded",
    description:
      "WorksRecorded turns WhatsApp updates into structured construction records, timesheets, production data, and cost control.",
    keywords: [
      "construction site records",
      "construction software",
      "construction cost control",
      "construction timesheets",
      "WorksRecorded"
    ]
  });
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!locales.includes(locale as any)) notFound();

  const messages = await getMessages();
  const documentLanguageScript = `document.documentElement.lang=${JSON.stringify(locale)}`;

  return (
    <>
      <script dangerouslySetInnerHTML={{__html: documentLanguageScript}} />
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </>
  );
}
