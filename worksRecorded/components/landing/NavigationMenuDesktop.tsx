"use client";

import * as React from "react";
import Link from "next/link";
import { useIsMobile } from "@/lib/utils/hooks/use-mobile";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DATA_LINKS, MAIN_LINKS } from "@/components/landing/NavigationLinks";

export function NavigationMenuDesktop() {
  const [selectedFeature, setSelectedFeature] = useState("Whatsapp");
  const isMobile = useIsMobile();
  const locale = useLocale();
  const t = useTranslations("Navigation");
  const featureLinks = locale === "lv"
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
      <NavigationMenuList className="flex-wrap">
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            {t("features")}
          </NavigationMenuTrigger>

          <NavigationMenuContent className="md:-translate-x-60 md:-translate-y-1">
            <ul className="grid gap-2 md:w-[400px] lg:w-[550px]">
              {featureLinks.map(({ id, href, titleKey, descriptionKey }) => (
                <ListItem
                  key={id}
                  href={withLocale(href)}
                  title={t(titleKey)}
                  onMouseEnter={() => setSelectedFeature(id)}
                  onFocus={() => setSelectedFeature(id)}
                >
                  {t(descriptionKey)}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {MAIN_LINKS.map(({ href, labelKey }) => (
          <NavigationMenuItem key={href}>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <Link href={withLocale(href)}>
                {t(labelKey)}
              </Link>
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
