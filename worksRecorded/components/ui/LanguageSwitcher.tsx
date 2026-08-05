"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(nextLocale: "en" | "lv" | "ru") {
    const newPath = pathname.replace(/^\/(en|lv|ru)(?=\/|$)/, `/${nextLocale}`);
    router.push(newPath);
  }

  const base = "rounded px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground";
  const active = "rounded bg-background px-2 py-1 text-xs font-semibold text-foreground shadow-sm";

  return (
    <div className="inline-flex items-center rounded-md border bg-muted/60 p-0.5" aria-label="Language">
      <button
        type="button"
        onClick={() => switchTo("lv")}
        className={locale === "lv" ? active : base}
        aria-label="Latviešu"
      >
        LV
      </button>

      <button
        type="button"
        onClick={() => switchTo("en")}
        className={locale === "en" ? active : base}
        aria-label="English"
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => switchTo("ru")}
        className={locale === "ru" ? active : base}
        aria-label="Русский"
      >
        RU
      </button>
    </div>
  );
}
