"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type * as React from "react";
import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { DATA_LINKS, MAIN_LINKS } from "@/components/landing/NavigationLinks";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils/utils";

export function NavigationMenuDesktop() {
  const [featuresOpen, setFeaturesOpen] = useState(false);
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
    <NavigationMenu viewport={false}>
      <NavigationMenuList className="flex-nowrap gap-0.5">
        <NavigationMenuItem>
          <Popover open={featuresOpen} onOpenChange={setFeaturesOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="group inline-flex h-9 items-center justify-center rounded-full bg-transparent px-3 text-sm font-medium text-[#354038] outline-none transition-colors hover:bg-[#f4f7f4] hover:text-[#101610] focus-visible:ring-3 focus-visible:ring-emerald-700/20 data-[state=open]:bg-[#f4f7f4] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:data-[state=open]:bg-slate-800"
              >
                {t("features")}
                <ChevronDownIcon
                  className="relative top-px ml-1 size-3 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              sideOffset={8}
              className="z-[70] w-[min(550px,calc(100vw-2rem))] rounded-2xl border-slate-200 bg-white/98 p-2 shadow-2xl shadow-slate-900/15 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/98"
            >
              <ul className="grid gap-1.5">
                {featureLinks.map(({ id, href, titleKey, descriptionKey }) => (
                  <ListItem
                    key={id}
                    href={withLocale(href)}
                    title={t(titleKey)}
                    onNavigate={() => setFeaturesOpen(false)}
                  >
                    {t(descriptionKey)}
                  </ListItem>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
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
  onNavigate,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & {
  href: string;
  onNavigate?: () => void;
}) {
  return (
    <li {...props}>
      <Link
        href={href}
        onClick={onNavigate}
        className="block rounded-xl px-3 py-2.5 outline-none transition-colors hover:bg-[#f4f7f4] focus-visible:bg-[#f4f7f4] focus-visible:ring-3 focus-visible:ring-emerald-700/20 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
      >
        <div className="text-base font-semibold leading-tight text-slate-950 dark:text-white">
          {title}
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500 dark:text-slate-300">
          {children}
        </p>
      </Link>
    </li>
  );
}
