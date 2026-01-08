// C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\components\landing\Landing\Text.tsx

"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function WhatDoWeDo() {
  const t = useTranslations("LandingText");

  const items = [
    { title: t("whatDoWeDo.items.0.title") },
    { title: t("whatDoWeDo.items.1.title") },
    { title: t("whatDoWeDo.items.2.title") },
    { title: t("whatDoWeDo.items.3.title") },
    { title: t("whatDoWeDo.items.4.title") },
    { title: t("whatDoWeDo.items.5.title") },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-foreground">
        {t("whatDoWeDo.heading")}
      </h3>
      <ul className="space-y-3">
        {items.map(({ title }) => (
          <li key={title} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p className="leading-relaxed text-foreground">
              <span className="font-semibold">{title}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HowDoWeDoThat() {
  const t = useTranslations("LandingText");

  const items = [
    {
      title: t("howDoWeDoThat.items.0.title"),
      desc: t("howDoWeDoThat.items.0.desc"),
    },
    {
      title: t("howDoWeDoThat.items.1.title"),
      desc: t("howDoWeDoThat.items.1.desc"),
    },
    {
      title: t("howDoWeDoThat.items.2.title"),
      desc: t("howDoWeDoThat.items.2.desc"),
    },
    {
      title: t("howDoWeDoThat.items.3.title"),
      desc: t("howDoWeDoThat.items.3.desc"),
    },
    {
      title: t("howDoWeDoThat.items.4.title"),
      desc: t("howDoWeDoThat.items.4.desc"),
    },
    {
      title: t("howDoWeDoThat.items.5.title"),
      desc: t("howDoWeDoThat.items.5.desc"),
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold text-foreground">
        {t("howDoWeDoThat.heading")}
      </h3>
      <ul className="space-y-3">
        {items.map(({ title, desc }) => (
          <li key={title} className="flex items-start gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden />
            <p className="leading-relaxed text-foreground">
              <span className="font-semibold">{title}</span>
              {desc ? <span> — {desc}</span> : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Why() {
  const t = useTranslations("LandingText");

  const bullets = [
    t("why.bullets.0"),
    t("why.bullets.1"),
    t("why.bullets.2"),
    t("why.bullets.3"),
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-foreground">{t("why.heading")}</h3>
      <p className="text-foreground">{t("why.description")}</p>
      <ul className="space-y-3">
        {bullets.map((text) => (
          <li key={text} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p className="leading-relaxed text-foreground">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
