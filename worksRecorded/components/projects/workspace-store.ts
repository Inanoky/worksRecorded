import type { ReactNode } from "react";
import type { LimeniProjectSnapshot } from "@/flows/default-construction/visual/project-snapshot-store";
import { FLOW_MODULE_KEYS, type FlowModuleKey } from "@/lib/flows/types";

export const RECENT_PROJECT_LIMIT = 5;
export const BEFORE_WORKSPACE_NAVIGATION =
	"project-workspace:before-navigation";
export type WorkspaceDescriptor = {
	siteId: string;
	userId: string;
	organizationId: string | null;
	name: string;
	flowModuleKey: FlowModuleKey;
	visualPreload?: boolean;
	fimaActs?: boolean;
	constructionWorkspace?: boolean;
};
export type WorkspaceRoute = { href: string; content: ReactNode };
export type ProjectWorkspace = {
	descriptor: WorkspaceDescriptor;
	routes: ReadonlyMap<string, WorkspaceRoute>;
	lastHref: string;
	authorizedAt: number;
	initialDiary?: LimeniProjectSnapshot;
};
export function retainProjectFlow(flow: FlowModuleKey) {
	return (
		flow !== FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL &&
		flow !== FLOW_MODULE_KEYS.ZTC_PRODUCTION
	);
}
export function projectIdFromHref(href: string) {
	return /^\/dashboard\/sites\/([^/?#]+)(?:\/|$)/.exec(href)?.[1] ?? null;
}
export function createWorkspaceStore(
	userId: string,
	organizationId: string | null,
	limit = RECENT_PROJECT_LIMIT,
) {
	let snapshot: readonly ProjectWorkspace[] = [];
	const empty: readonly ProjectWorkspace[] = [];
	const listeners = new Set<() => void>();
	const protections = new Map<string, Set<string>>();
	let activeId: string | null = null;
	const roots = new Map<string, WorkspaceRoute>();
	const rootHref = (href: string) =>
		href === "/dashboard/sites" ? "/dashboard" : href;
	const notify = () => {
		for (const listener of listeners) listener();
	};
	const trim = () => {
		while (snapshot.length > limit) {
			const oldest = snapshot.find(
				(entry) =>
					entry.descriptor.siteId !== activeId &&
					!protections.get(entry.descriptor.siteId)?.size,
			);
			if (!oldest) break;
			snapshot = snapshot.filter((entry) => entry !== oldest);
			protections.delete(oldest.descriptor.siteId);
		}
	};
	const allowed = (descriptor: WorkspaceDescriptor) =>
		descriptor.userId === userId &&
		(!organizationId || descriptor.organizationId === organizationId) &&
		retainProjectFlow(descriptor.flowModuleKey);
	return {
		resolveHref(href: string) {
			const root = rootHref(href);
			return root === "/dashboard" &&
				!roots.has(root) &&
				roots.has("/dashboard/fima")
				? "/dashboard/fima"
				: root;
		},
		registerRoot(href: string, content: ReactNode) {
			if (
				!["/dashboard", "/dashboard/fima"].includes(href) ||
				roots.get(href)?.content === content
			)
				return;
			roots.set(href, { href, content });
			snapshot = [...snapshot];
			notify();
		},
		getRoots: () => [...roots.values()],
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		getSnapshot: () => snapshot,
		getServerSnapshot: () => empty,
		register(descriptor: WorkspaceDescriptor) {
			if (!allowed(descriptor)) return false;
			const existing = snapshot.find(
				(entry) => entry.descriptor.siteId === descriptor.siteId,
			);
			if (
				existing &&
				JSON.stringify(existing.descriptor) === JSON.stringify(descriptor)
			)
				return true;
			const entry = {
				descriptor,
				routes: existing?.routes ?? new Map(),
				lastHref: existing?.lastHref ?? "",
				authorizedAt: Date.now(),
				initialDiary: descriptor.constructionWorkspace ? existing?.initialDiary : undefined,
			};
			snapshot = existing
				? snapshot.map((value) => (value === existing ? entry : value))
				: [...snapshot, entry];
			trim();
			notify();
			return true;
		},
		registerRoute(
			descriptor: WorkspaceDescriptor,
			href: string,
			content: ReactNode,
			active = true,
			initialDiary?: LimeniProjectSnapshot,
		) {
			if (!allowed(descriptor) || projectIdFromHref(href) !== descriptor.siteId)
				return;
			if (active) this.visit(href);
			this.register(descriptor);
			const entry = snapshot.find(
				(value) => value.descriptor.siteId === descriptor.siteId,
			);
			if (!entry || entry.routes.get(href)?.content === content) return;
			const routes = new Map(entry.routes);
			routes.set(href, { href, content });
			snapshot = snapshot.map((value) =>
				value === entry ? { ...entry, routes, initialDiary: initialDiary ?? entry.initialDiary } : value,
			);
			notify();
		},
		visit(href: string) {
			activeId = projectIdFromHref(href);
			const entry = snapshot.find(
				(value) => value.descriptor.siteId === activeId,
			);
			if (!entry) return;
			if (entry === snapshot.at(-1) && entry.lastHref === href) return;
			snapshot = [
				...snapshot.filter((value) => value !== entry),
				{ ...entry, lastHref: href },
			];
			trim();
			notify();
		},
		hasRoute(href: string) {
			if (roots.has(this.resolveHref(href))) return true;
			return snapshot.some((entry) => {
				if (entry.routes.has(href)) return true;
				if (!entry.routes.size) return false;
				const base = `/dashboard/sites/${entry.descriptor.siteId}/`;
				return (
					(entry.descriptor.constructionWorkspace &&
						["dashboard", "analytics"].some((view) => href === base + view)) ||
					(entry.descriptor.visualPreload &&
						["dashboard", "izpildshemas", "analytics", "spending"].some(
							(view) => href === base + view,
						)) ||
					(entry.descriptor.fimaActs &&
						["dashboard", "siteDiary", "acts"].some(
							(view) => href === base + view,
						))
				);
			});
		},
		isProtected(siteId: string) {
			return !!protections.get(siteId)?.size;
		},
		preferredHref(siteId: string, fallback: string) {
			return (
				snapshot.find((entry) => entry.descriptor.siteId === siteId)
					?.lastHref || fallback
			);
		},
		protect(siteId: string, token: string, dirty: boolean) {
			const tokens = protections.get(siteId) ?? new Set<string>();
			if (dirty) tokens.add(token);
			else tokens.delete(token);
			protections.set(siteId, tokens);
			const previous = snapshot;
			trim();
			if (previous !== snapshot) notify();
		},
		remove(siteId: string) {
			protections.delete(siteId);
			snapshot = snapshot.filter((entry) => entry.descriptor.siteId !== siteId);
			notify();
		},
		clear() {
			roots.clear();
			protections.clear();
			snapshot = [];
			activeId = null;
			notify();
		},
	};
}
export type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;
