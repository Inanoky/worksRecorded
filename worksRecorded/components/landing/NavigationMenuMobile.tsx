"use client";

import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Menu } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AGENTS, SERVICES } from "@/components/landing/agents/catalog";
import {
	COMPANY_LINKS,
	MAIN_LINKS,
} from "@/components/landing/NavigationLinks";
import Link from "@/components/landing/navigation/LandingLink";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NavigationMenuMobile() {
	const t = useTranslations("AgentLanding");
	const auth = useTranslations("AuthButtons");
	const locale = useLocale();
	const menuId = "landing-mobile-navigation-trigger";
	return (
		<DropdownMenu modal>
			<DropdownMenuTrigger asChild id={menuId}>
				<Button
					variant="ghost"
					size="icon"
					className="rounded-full"
					aria-label={t("nav.menu")}
				>
					<Menu size={23} aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				aria-labelledby={menuId}
				align="end"
				className="max-h-[80dvh] w-[min(340px,calc(100vw-2rem))] overflow-y-auto overscroll-contain p-2"
			>
				<DropdownMenuLabel>{t("nav.agents")}</DropdownMenuLabel>
				<DropdownMenuItem asChild>
					<Link href={`/${locale}/Landing/Agents`} className="font-semibold">
						{t("nav.allAgents")}
					</Link>
				</DropdownMenuItem>
				{AGENTS.map(({ id, icon: Icon }) => (
					<DropdownMenuItem key={id} asChild>
						<Link href={`/${locale}/Landing/Agents#${id}`}>
							<Icon size={16} aria-hidden="true" />
							{t(`agents.${id}.title`)}
						</Link>
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuLabel>{t("nav.services")}</DropdownMenuLabel>
				{SERVICES.map(({ id }) => (
					<DropdownMenuItem asChild key={id}>
						<Link href={`/${locale}/Landing/Services#${id}`}>
							{t(`services.${id}.title`)}
						</Link>
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				{[...MAIN_LINKS, ...COMPANY_LINKS].map(({ href, labelKey }) => (
					<DropdownMenuItem key={href} asChild>
						<Link href={`/${locale}${href}`}>{t(`nav.${labelKey}`)}</Link>
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<LoginLink className="w-full font-medium">{auth("signIn")}</LoginLink>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
