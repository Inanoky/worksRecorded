"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type * as React from "react";
import { DATA_LINKS, MAIN_LINKS } from "@/components/landing/NavigationLinks";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useIsMobile } from "@/lib/utils/hooks/use-mobile";
import { cn } from "@/lib/utils/utils";

export function NavigationMenuDesktop() {
  const isMobile = useIsMobile();
  const locale = useLocale();
  const t = useTranslations("Navigation");
  const featureLinks =
    locale === "lv"
      ? [
          ...DATA_LINKS,
          {
            id: "BISIntegration",
            href: "/Landing/BIS-integracija",
            titleKey: "data.bisIntegration.title",
            descriptionKey: "data.bisIntegration.description",
          } as const,
        ]
      : DATA_LINKS;

  const withLocale = (href: string) => {
    if (/^https?:\/\//.test(href)) return href;
    if (/^\/(en|lv|ru)(\/|$)/.test(href)) return href;
    return `/${locale}${href.startsWith("/") ? href : `/${href}`}`;
  };

  return (
    <NavigationMenu viewport={isMobile}>
      <NavigationMenuList className="flex-nowrap gap-0.5">
        <NavigationMenuItem>
          <NavigationMenuTrigger className="rounded-full bg-transparent px-3 text-sm font-medium text-[#354038] hover:bg-[#f4f7f4] hover:text-[#101610] data-[state=open]:bg-[#f4f7f4] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:data-[state=open]:bg-slate-800">
            {t("features")}
          </NavigationMenuTrigger>

          <NavigationMenuContent className="md:-translate-x-60 md:-translate-y-1">
            <ul className="grid gap-2 md:w-[400px] lg:w-[550px]">
              {featureLinks.map(({ id, href, titleKey, descriptionKey }) => (
                <ListItem key={id} href={withLocale(href)} title={t(titleKey)}>
                  {t(descriptionKey)}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {MAIN_LINKS.map(({ href, labelKey }) => (
          <NavigationMenuItem key={href}>
            <NavigationMenuLink
              asChild
              className={cn(
                navigationMenuTriggerStyle(),
                "rounded-full bg-transparent px-3 text-sm font-medium text-[#354038] hover:bg-[#f4f7f4] hover:text-[#101610] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white",
              )}
            >
              <Link href={withLocale(href)}>{t(labelKey)}</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link href={href}>
          <div className="text-lg leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-3 text-l leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}
