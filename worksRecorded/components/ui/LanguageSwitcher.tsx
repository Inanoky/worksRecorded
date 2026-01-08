"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(nextLocale: "en" | "lv") {
    const newPath = pathname.replace(/^\/(en|lv)(?=\/|$)/, `/${nextLocale}`);
    router.push(newPath);
  }

  const base =
    "opacity-50 hover:opacity-80 transition-opacity rounded-sm";
  const active = "opacity-100";

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={() => switchTo("en")}
        className={locale === "en" ? active : base}
        aria-label="English"
      >
        <Image
          src="/flags/gb.svg"
          alt="English"
          width={24}
          height={16}
        />
      </button>

      <button
        onClick={() => switchTo("lv")}
        className={locale === "lv" ? active : base}
        aria-label="Latviešu"
      >
        <Image
          src="/flags/lv.svg"
          alt="Latvian"
          width={24}
          height={16}
        />
      </button>
    </div>
  );
}
