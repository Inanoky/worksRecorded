"use client";
import Link from "next/link";
import { type ComponentProps, createContext, useContext } from "react";

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
	const local = navigation?.local(href) ?? false;
	return (
		<Link
			{...props}
			href={href}
			prefetch={false}
			onMouseEnter={(event) => {
				if (!local) onMouseEnter?.(event);
			}}
			onFocus={(event) => {
				if (!local) onFocus?.(event);
			}}
			onTouchStart={(event) => {
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
