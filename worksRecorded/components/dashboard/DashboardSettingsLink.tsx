"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentProps, createContext, useContext } from "react";

export const ORGANIZATION_SETTINGS_PATH = "/dashboard/settings";
export const FLOW_CONFIGS_PATH = "/dashboard/admin/flow-configs";

export function isDashboardSettingsPath(pathname: string) {
	return (
		pathname === ORGANIZATION_SETTINGS_PATH || pathname === FLOW_CONFIGS_PATH
	);
}

export const DashboardSettingsNavigationContext = createContext<{
	preload: (href: string) => void;
} | null>(null);

export function DashboardSettingsLink({
	href,
	onMouseEnter,
	onFocus,
	onTouchStart,
	onNavigate,
	...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
	const settings = useContext(DashboardSettingsNavigationContext);
	const router = useRouter();
	const clientNavigation = settings && isDashboardSettingsPath(href);
	const preload = () => {
		if (clientNavigation) settings.preload(href);
		else router.prefetch(href);
	};

	return (
		<Link
			{...props}
			href={href}
			prefetch={false}
			onMouseEnter={(event) => {
				onMouseEnter?.(event);
				preload();
			}}
			onFocus={(event) => {
				onFocus?.(event);
				preload();
			}}
			onTouchStart={(event) => {
				onTouchStart?.(event);
				preload();
			}}
			onNavigate={(event) => {
				let cancelled = false;
				onNavigate?.({
					preventDefault: () => {
						cancelled = true;
						event.preventDefault();
					},
				});
				if (cancelled || !clientNavigation) return;
				event.preventDefault();
				settings.preload(href);
				if (
					window.location.pathname !== href ||
					window.location.search ||
					window.location.hash
				) {
					if (props.replace) window.history.replaceState(null, "", href);
					else window.history.pushState(null, "", href);
					if (props.scroll !== false) window.scrollTo(0, 0);
				}
			}}
		/>
	);
}
