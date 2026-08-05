"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/utils";
import { Menu } from "lucide-react";
import { COMBINED_LINKS } from "@/components/landing/NavigationLinks";
import { useLocale, useTranslations } from "next-intl";

export function NavigationMenuMobile() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Navigation");
  const menuLinks = locale === "lv"
    ? [
        ...COMBINED_LINKS,
        {
          id: "BISIntegration",
          href: "/Landing/BIS-integracija",
          titleKey: "data.bisIntegration.title",
          descriptionKey: "data.bisIntegration.description",
        } as const,
      ]
    : COMBINED_LINKS;

  const withLocale = (href: string) => {
    if (/^https?:\/\//.test(href)) return href;
    if (/^\/(en|lv|ru)(\/|$)/.test(href)) return href;
    return `/${locale}${href.startsWith("/") ? href : `/${href}`}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Menu className="h-10 w-10" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        {menuLinks.map((item) => {
          const href = withLocale(item.href);
          const active =
            pathname === href || pathname.startsWith(href + "/");

          return (
            <DropdownMenuItem key={item.id} asChild>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2 w-full",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {t(item.titleKey)}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
