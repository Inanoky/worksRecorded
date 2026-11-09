"use client";
import Link from "next/link";
import { type ComponentProps, createContext, useContext } from "react";
import { useWorkspaceNavigation } from "@/components/projects/WorkspaceNavigation";
import { useZtcNavigation } from "@/flows/ztc-production/frontend/ZtcNavigationContext";
import { DEMO_SITE_ID } from "@/flows/demo/constants";
import { loadOzoluClient, openOzoluProject } from "@/flows/demo/client/OzoluClient";

export const FimaProjectNavigationContext = createContext<{
	local: (href: string) => boolean;
	navigate?: (
		href: string,
		options: { replace?: boolean; scroll?: boolean },
	) => void;
} | null>(null);
export function FimaProjectNavigationLink({
	href,
	onMouseEnter,
	onFocus,
	onTouchStart,
	onNavigate,
	...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
	const navigation = useContext(FimaProjectNavigationContext);
	const ztc = useZtcNavigation();
	const workspace = useWorkspaceNavigation();
	const cached = workspace?.store.hasRoute(href) ?? false;
	const ozolu = href === "/demo" || href.startsWith(`/dashboard/sites/${DEMO_SITE_ID}/`);
	const local =
		ozolu ||
		(ztc?.canNavigate(href) ?? false) ||
		cached ||
		(navigation?.local(href) ?? false);
	return (
		<Link
			{...props}
			href={ozolu ? "/demo" : href}
			prefetch={false}
			onMouseEnter={(event) => {
				if (ozolu) void loadOzoluClient();
				if (!local) onMouseEnter?.(event);
			}}
			onFocus={(event) => {
				if (ozolu) void loadOzoluClient();
				if (!local) onFocus?.(event);
			}}
			onTouchStart={(event) => {
				if (ozolu) void loadOzoluClient();
				if (!local) onTouchStart?.(event);
			}}
			onNavigate={(event) => {
				let cancelled = false;
				onNavigate?.({
					preventDefault: () => {
						cancelled = true;
						event.preventDefault();
					},
				});
				if (cancelled || !local) return;
				event.preventDefault();
				if (ozolu) {
					openOzoluProject();
					return;
				}
				if (ztc?.navigate(href, props)) return;
				if (cached && workspace?.navigate(href, props)) return;
				if (navigation?.navigate) {
					navigation.navigate(href, props);
					return;
				}
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
