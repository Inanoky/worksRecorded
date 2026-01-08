"use client"

import * as React from "react"
import Link from "next/link"
import { useIsMobile } from "@/lib/utils/hooks/use-mobile"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { useState } from "react"
import { useLocale } from "next-intl"
import { DATA_LINKS, MAIN_LINKS } from "@/components/landing/NavigationLinks"

export function NavigationMenuDesktop() {
  const [selectedFeature, setSelectedFeature] = useState("Whatsapp")
  const isMobile = useIsMobile()
  const locale = useLocale()

  const withLocale = (href: string) => {
    if (/^https?:\/\//.test(href)) return href
    if (/^\/(en|lv)(\/|$)/.test(href)) return href
    const clean = href.startsWith("/") ? href : `/${href}`
    return `/${locale}${clean}`
  }

  return (
    <NavigationMenu viewport={isMobile}>
      <NavigationMenuList className="flex-wrap">
        <NavigationMenuItem>
          <NavigationMenuTrigger>Features</NavigationMenuTrigger>

          <NavigationMenuContent className="md:-translate-x-60 md:-translate-y-1">
            <ul className="grid gap-2 md:w-[400px] lg:w-[550px]">
              {DATA_LINKS.map(({ id, href, title, description }) => (
                <ListItem
                  key={id}
                  href={withLocale(href)}
                  title={title}
                  onMouseEnter={() => setSelectedFeature(id)}
                  onFocus={() => setSelectedFeature(id)}
                >
                  {description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {MAIN_LINKS.map(({ href, label }) => (
          <NavigationMenuItem key={href}>
            <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
              <Link href={withLocale(href)} className="text-2xl">
                {label}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
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
          <div className="text-lg leading-none font-large font-medium">
            {title}
          </div>
          <p className="text-muted-foreground line-clamp-3 text-l leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}
