import { useSyncExternalStore } from "react";
import { DEMO_SITE_ID } from "../constants";
export const viewNames = ["bis", "diary", "visual", "forma2", "hours"] as const;
export type ViewName = (typeof viewNames)[number];
const listeners = new Set<() => void>();
export function currentView(): ViewName {
	if (typeof window === "undefined") return "bis";
	const view = window.location.hash.slice(1);
	return viewNames.includes(view as ViewName) ? (view as ViewName) : "bis";
}
export function navigate(view: ViewName) {
	window.history.pushState(null, "", `/demo#${view}`);
	for (const listener of listeners) listener();
}
export async function loadOzoluClient() {}
export function openOzoluProject() {
	navigate("bis");
}
export function subscribeNavigation(listener: () => void) {
	listeners.add(listener);
	window.addEventListener("popstate", listener);
	window.addEventListener("hashchange", listener);
	return () => {
		listeners.delete(listener);
		window.removeEventListener("popstate", listener);
		window.removeEventListener("hashchange", listener);
	};
}
export function useView() {
	return useSyncExternalStore(
		subscribeNavigation,
		currentView,
		() => "bis" as ViewName,
	);
}
export function usePathname() {
	const view = useView();
	return `/dashboard/sites/${DEMO_SITE_ID}/${{ bis: "dashboard", diary: "siteDiary", visual: "izpildshemas", forma2: "analytics", hours: "timesheets" }[view]}`;
}
export function useParams() {
	return { siteId: DEMO_SITE_ID, locale: "lv" };
}
export function useSearchParams() {
	return new URLSearchParams();
}
export function useRouter() {
	return {
		refresh() {
			for (const listener of listeners) listener();
		},
		push(href: string) {
			navigate(
				href.includes("izpildshemas")
					? "visual"
					: href.includes("analytics")
						? "forma2"
						: href.includes("timesheets")
							? "hours"
							: "bis",
			);
		},
		replace(href: string) {
			this.push(href);
		},
		prefetch: async () => {},
		back() {
			window.history.back();
		},
	};
}
