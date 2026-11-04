"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useLandingNavigation } from "./LandingNavigationContext";
import { getLandingRoute } from "./landing-routes";

export default function LandingLink({
	href,
	onMouseEnter,
	onFocus,
	onNavigate,
	...props
}: ComponentProps<typeof NextLink>) {
	const navigation = useLandingNavigation();
	function prefetch() {
		if (typeof href === "string") navigation?.prefetch(href);
	}
	return (
		<NextLink
			{...props}
			href={href}
			prefetch={navigation ? false : props.prefetch}
			onMouseEnter={(event) => {
				onMouseEnter?.(event);
				prefetch();
			}}
			onFocus={(event) => {
				onFocus?.(event);
				prefetch();
			}}
			onNavigate={(event) => {
				let prevented = false;
				onNavigate?.({
					preventDefault: () => {
						prevented = true;
						event.preventDefault();
					},
				});
				if (prevented || !navigation || typeof href !== "string") return;
				const url = new URL(href, window.location.href);
				if (url.origin !== window.location.origin || !getLandingRoute(url))
					return;
				event.preventDefault();
				void navigation.navigate(url.href);
			}}
		/>
	);
}
