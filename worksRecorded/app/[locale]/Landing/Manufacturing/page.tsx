import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import {
  Camera,
  ChartNoAxesCombined,
  Clock3,
  Coins,
  Factory,
  FileSpreadsheet,
  MessageCircle,
  SquareCheckBig,
} from "lucide-react";

import { buildLandingMetadata } from "@/lib/seo/landingMetadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const VIDEO_ID = "XHeTJTIfXQU";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/Landing/Manufacturing",
    title: "Manufacturing Production Journal | WorksRecorded",
    description:
      "Track manufacturing operations, planned versus actual labor norms, photos, payroll, productivity, and exports with WorksRecorded.",
    keywords: [
      "manufacturing software",
      "production journal",
      "manufacturing productivity",
      "WhatsApp work tracking",
      "WorksRecorded",
    ],
  });
}

export default function Page() {
  const t = useTranslations("Manufacturing");

  const benefits = [
    { text: t("benefits.items.0"), Icon: Clock3 },
    { text: t("benefits.items.1"), Icon: ChartNoAxesCombined },
    { text: t("benefits.items.2"), Icon: SquareCheckBig },
    { text: t("benefits.items.3"), Icon: Camera },
  ];

  const dashboardItems = [
    { text: t("dashboard.items.0"), Icon: Clock3 },
    { text: t("dashboard.items.1"), Icon: ChartNoAxesCombined },
    { text: t("dashboard.items.2"), Icon: Coins },
    { text: t("dashboard.items.3"), Icon: FileSpreadsheet },
  ];

  const whatsappItems = [
    { text: t("whatsapp.items.0"), Icon: Factory },
    { text: t("whatsapp.items.1"), Icon: Clock3 },
    { text: t("whatsapp.items.2"), Icon: Camera },
    { text: t("whatsapp.items.3"), Icon: MessageCircle },
  ];

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="border-b bg-[#f7faf8]">
        <div className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-7xl flex-col justify-center px-5 py-12 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm">
              <Factory className="h-4 w-4" />
              {t("eyebrow")}
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-6xl lg:text-7xl">
              {t("title")}
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-muted-foreground sm:text-xl">
              {t("intro")}
            </p>
          </div>

          <div id="demo-video" className="mx-auto mt-10 w-full max-w-6xl">
            <div className="overflow-hidden rounded-lg border bg-black shadow-2xl shadow-black/25">
              <div className="relative aspect-video w-full">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${VIDEO_ID}`}
                  title={t("videoTitle")}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
                <span className="font-semibold text-foreground">WhatsApp</span>
                <span className="block">{t("whatsapp.items.3")}</span>
              </div>
              <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
                <span className="font-semibold text-foreground">{t("dashboard.title")}</span>
                <span className="block">{t("dashboard.items.1")}</span>
              </div>
              <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
                <span className="font-semibold text-foreground">Excel</span>
                <span className="block">{t("dashboard.items.3")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-6 lg:py-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              {t("dashboard.title")}
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              {t("dashboard.title")}
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
              {t("dashboard.text")}
            </p>
          </div>

          <div className="divide-y rounded-lg border bg-white shadow-sm">
            {dashboardItems.map(({ text, Icon }) => (
              <div key={text} className="flex gap-4 p-5 sm:p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-base leading-7 sm:text-lg">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div className="order-2 divide-y rounded-lg border bg-white shadow-sm lg:order-1">
            {whatsappItems.map(({ text, Icon }) => (
              <div key={text} className="flex gap-4 p-5 sm:p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-base leading-7 sm:text-lg">{text}</p>
              </div>
            ))}
          </div>

          <div className="order-1 max-w-xl lg:order-2">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              WhatsApp
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              {t("whatsapp.title")}
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
              {t("whatsapp.text")}
            </p>
          </div>
        </div>
      </div>

      <div className="border-y bg-[#fbfaf7]">
        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              WorksRecorded
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              {t("benefits.title")}
            </h2>
          </div>

          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ text, Icon }) => (
              <li key={text} className="rounded-lg border bg-white p-5 shadow-sm">
                <Icon className="h-6 w-6 text-primary" />
                <p className="mt-4 text-base leading-7">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
