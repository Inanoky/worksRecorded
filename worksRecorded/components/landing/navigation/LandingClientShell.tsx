"use client";

import { NextIntlClientProvider, useLocale, useMessages } from "next-intl";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import HeaderDesktop from "../HeaderDesktop";
import HeaderMobile from "../HeaderMobile";
import LandingFooter from "../LandingFooter";
import { createLandingMetadataController } from "./document-metadata";
import { LandingNavigationContext } from "./LandingNavigationContext";
import {
	type LoadedLandingPage,
	preloadLandingPage,
} from "./landing-page-registry";
import {
	getLandingRoute,
	type LandingDocumentMetadata,
	type LandingMetadataMap,
} from "./landing-routes";

type LocaleResources = {
	messages: ReturnType<typeof useMessages>;
	metadata: LandingMetadataMap;
};
type ScrollPosition = [number, number];

const loadingLabels: Record<string, string> = {
	lv: "Atver lapu…",
	en: "Opening page…",
	ru: "Открываем страницу…",
};
const errorLabels: Record<string, string> = {
	lv: "Neizdevās atvērt lapu. Mēģiniet vēlreiz.",
	en: "Unable to open the page. Please try again.",
	ru: "Не удалось открыть страницу. Повторите попытку.",
};

export default function LandingClientShell({
	children,
	metadata,
}: {
	children: ReactNode;
	metadata: LandingMetadataMap;
}) {
	const initialLocale = useLocale();
	const initialMessages = useMessages();
	const [locale, setLocale] = useState(initialLocale);
	const [messages, setMessages] = useState(initialMessages);
	const [page, setPage] = useState<LoadedLandingPage | null>(null);
	const [pending, setPending] = useState(false);
	const [revision, setRevision] = useState(0);
	const localeResources = useRef(new Map<string, Promise<LocaleResources>>());
	const requestId = useRef(0);
	const scrollTarget = useRef<{
		href: string;
		position?: ScrollPosition;
	} | null>(null);
	const content = useRef<HTMLDivElement>(null);
	const metadataController = useRef<ReturnType<
		typeof createLandingMetadataController
	> | null>(null);
	const metadataTarget = useRef<LandingDocumentMetadata | null>(null);

	const loadLocale = useCallback(
		(target: string) => {
			if (target === initialLocale)
				return Promise.resolve({ messages: initialMessages, metadata });
			const cached = localeResources.current.get(target);
			if (cached) return cached;
			const promise: Promise<LocaleResources> = fetch(
				`/api/landing/locale?locale=${target}`,
			)
				.then(async (response) => {
					if (!response.ok) throw new Error("Unable to load language");
					return response.json();
				})
				.catch((error) => {
					localeResources.current.delete(target);
					throw error;
				});
			localeResources.current.set(target, promise);
			return promise;
		},
		[initialLocale, initialMessages, metadata],
	);

	const navigate = useCallback(
		async (href: string, popState?: { position?: ScrollPosition }) => {
			const url = new URL(href, window.location.href);
			const route = getLandingRoute(url);
			if (url.origin !== window.location.origin || !route) return;
			const currentRequest = ++requestId.current;
			setPending(true);
			try {
				const [resources, loaded] = await Promise.all([
					loadLocale(route.locale),
					preloadLandingPage(route),
				]);
				if (currentRequest !== requestId.current) return;
				if (!popState && window.location.href !== url.href) {
					window.history.replaceState(
						{
							...window.history.state,
							landingScroll: [window.scrollX, window.scrollY],
						},
						"",
					);
					window.history.pushState(
						{ ...window.history.state, landingScroll: [0, 0] },
						"",
						route.href,
					);
				}
				const documentMetadata =
					loaded.metadata || resources.metadata[route.path];
				metadataTarget.current = documentMetadata || null;
				document.documentElement.lang = route.locale;
				setLocale(route.locale);
				setMessages(resources.messages);
				setPage(loaded);
				scrollTarget.current = { href: url.href, position: popState?.position };
				setRevision((value) => value + 1);
			} catch {
				if (currentRequest === requestId.current) {
					if (popState) {
						window.location.assign(url.href);
						return;
					}
					toast.error(errorLabels[route.locale] || errorLabels.en);
				}
			} finally {
				if (currentRequest === requestId.current) setPending(false);
			}
		},
		[loadLocale],
	);

	const prefetch = useCallback(
		(href: string) => {
			const url = new URL(href, window.location.href);
			const route = getLandingRoute(url);
			if (url.origin !== window.location.origin || !route) return;
			void Promise.all([
				loadLocale(route.locale),
				preloadLandingPage(route),
			]).catch(() => {});
		},
		[loadLocale],
	);

	useEffect(() => {
		metadataController.current = createLandingMetadataController();
		void navigate(window.location.href, {});
		const restoration = window.history.scrollRestoration;
		window.history.scrollRestoration = "manual";
		const onPopState = (event: PopStateEvent) => {
			void navigate(window.location.href, {
				position: event.state?.landingScroll,
			});
		};
		window.addEventListener("popstate", onPopState);
		const onClick = (event: MouseEvent) => {
			if (
				event.defaultPrevented ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			)
				return;
			const anchor =
				event.target instanceof Element
					? event.target.closest("a[href]")
					: null;
			if (
				!(anchor instanceof HTMLAnchorElement) ||
				anchor.closest(".landing-tactile") ||
				anchor.hasAttribute("download") ||
				(anchor.target && anchor.target !== "_self")
			)
				return;
			const url = new URL(anchor.href, window.location.href);
			if (url.origin !== window.location.origin || !getLandingRoute(url))
				return;
			event.preventDefault();
			void navigate(url.href);
		};
		document.addEventListener("click", onClick);
		return () => {
			requestId.current += 1;
			metadataController.current?.restore();
			window.removeEventListener("popstate", onPopState);
			document.removeEventListener("click", onClick);
			window.history.scrollRestoration = restoration;
		};
	}, [navigate]);

	useLayoutEffect(() => {
		const target = scrollTarget.current;
		if (!revision || !target) return;
		if (metadataTarget.current)
			metadataController.current?.apply(metadataTarget.current);
		content.current?.focus({ preventScroll: true });
		const frame = window.requestAnimationFrame(() => {
			if (target.position) {
				window.scrollTo(...target.position);
				return;
			}
			let anchor = new URL(target.href).hash.slice(1);
			try {
				anchor = decodeURIComponent(anchor);
			} catch {}
			const element = anchor ? document.getElementById(anchor) : null;
			if (element) element.scrollIntoView();
			else window.scrollTo(0, 0);
		});
		return () => window.cancelAnimationFrame(frame);
	}, [revision]);

	const navigation = useMemo(
		() => ({ navigate: (href: string) => navigate(href), prefetch }),
		[navigate, prefetch],
	);
	return (
		<NextIntlClientProvider locale={locale} messages={messages}>
			<LandingNavigationContext value={navigation}>
				<div className="landing-tactile overflow-x-hidden antialiased">
					{pending ? (
						<output className="fixed inset-x-0 top-0 z-[100] h-1 bg-emerald-600">
							<span className="sr-only">
								{loadingLabels[locale] || loadingLabels.en}
							</span>
						</output>
					) : null}
					<div className="lg:hidden">
						<HeaderMobile />
					</div>
					<div className="hidden lg:block">
						<HeaderDesktop />
					</div>
					<div
						ref={content}
						tabIndex={-1}
						className="outline-none"
						aria-busy={pending}
					>
						{page ? page.render() : children}
					</div>
					<LandingFooter />
				</div>
			</LandingNavigationContext>
		</NextIntlClientProvider>
	);
}
