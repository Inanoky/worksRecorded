"use client";

import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { COMBINED_LINKS } from "@/components/landing/NavigationLinks";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/utils";

export function NavigationMenuMobile() {
	const pathname = usePathname();
	const locale = useLocale();
	const t = useTranslations("Navigation");
	const auth = useTranslations("AuthButtons");
	const menuLinks =
		locale === "lv"
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
					const active = pathname === href || pathname.startsWith(`${href}/`);

					return (
						<DropdownMenuItem key={item.id} asChild>
							<Link
								href={href}
								className={cn(
									"flex items-center gap-2 w-full",
									active ? "text-primary" : "text-muted-foreground",
								)}
							>
								{t(item.titleKey)}
							</Link>
						</DropdownMenuItem>
					);
				})}
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<LoginLink className="w-full font-medium text-foreground">
						{auth("signIn")}
					</LoginLink>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
