import {
	createWorkspaceStore,
	retainProjectFlow,
	type WorkspaceDescriptor,
} from "./workspace-store";

const descriptor = (
	siteId: string,
	extra: Partial<WorkspaceDescriptor> = {},
): WorkspaceDescriptor => ({
	siteId,
	name: siteId,
	userId: "user",
	organizationId: "org",
	flowModuleKey: "default-construction",
	...extra,
});
const href = (id: string) => `/dashboard/sites/${id}/dashboard`;

it("retains five recent projects and evicts the least recently used project", () => {
	const store = createWorkspaceStore("user", "org");
	for (const id of ["a", "b", "c", "d", "e"])
		store.registerRoute(descriptor(id), href(id), id);
	store.visit(href("a"));
	store.registerRoute(descriptor("f"), href("f"), "f");
	expect(store.getSnapshot().map((entry) => entry.descriptor.siteId)).toEqual([
		"c",
		"d",
		"e",
		"a",
		"f",
	]);
	expect(store.hasRoute(href("a"))).toBe(true);
	expect(store.hasRoute(href("b"))).toBe(false);
});
it("preserves drafts and evicts another project instead", () => {
	const store = createWorkspaceStore("user", "org");
	for (const id of ["a", "b", "c", "d", "e"])
		store.registerRoute(descriptor(id), href(id), id);
	store.protect("a", "edit", true);
	store.registerRoute(descriptor("f"), href("f"), "f");
	expect(store.hasRoute(href("a"))).toBe(true);
	expect(store.hasRoute(href("b"))).toBe(false);
	expect(store.getSnapshot()).toHaveLength(5);
});
it("pins unsaved projects if all five have drafts and trims after a draft is resolved", () => {
	const store = createWorkspaceStore("user", "org");
	for (const id of ["a", "b", "c", "d", "e"]) {
		store.registerRoute(descriptor(id), href(id), id);
		store.protect(id, "edit", true);
	}
	store.registerRoute(descriptor("f"), href("f"), "f");
	expect(store.hasRoute(href("f"))).toBe(true);
	expect(store.getSnapshot()).toHaveLength(6);
	store.protect("a", "edit", false);
	expect(store.getSnapshot()).toHaveLength(5);
	expect(store.hasRoute(href("a"))).toBe(false);
});
it("retains all visited views, query strings and the last selected view per project", () => {
	const store = createWorkspaceStore("user", "org");
	store.registerRoute(descriptor("a"), href("a"), "diary");
	const analytics = "/dashboard/sites/a/analytics?period=October";
	store.registerRoute(descriptor("a"), analytics, "analytics");
	store.visit(analytics);
	expect(store.preferredHref("a", href("a"))).toBe(analytics);
	expect(store.hasRoute(analytics)).toBe(true);
	expect(store.hasRoute(href("a"))).toBe(true);
	expect(store.hasRoute("/dashboard/sites/a/analytics?period=September")).toBe(
		false,
	);
});
it("does not retain TGEM or ZTC, or mix users and organizations", () => {
	const store = createWorkspaceStore("user", "org");
	for (const flowModuleKey of ["tgem-invoice-approval", "ztc-production"]) {
		expect(retainProjectFlow(flowModuleKey)).toBe(false);
		store.registerRoute(
			descriptor(flowModuleKey, { flowModuleKey }),
			href(flowModuleKey),
			"private",
		);
	}
	store.registerRoute(
		descriptor("another-user", { userId: "another-user" }),
		href("another-user"),
		"private",
	);
	store.registerRoute(
		descriptor("another-org", { organizationId: "another-org" }),
		href("another-org"),
		"private",
	);
	expect(store.getSnapshot()).toEqual([]);
	for (const flowModuleKey of [
		"default-construction",
		"default-production",
		"fima",
		"sprinkler-attendance",
	])
		expect(retainProjectFlow(flowModuleKey)).toBe(true);
});
it("reuses authorized preloaded Limeni and FIMA views without inventing other cached routes", () => {
	const store = createWorkspaceStore("user", "org");
	store.registerRoute(
		descriptor("limeni", { visualPreload: true }),
		href("limeni"),
		null,
	);
	store.registerRoute(
		descriptor("fima", { fimaActs: true }),
		href("fima"),
		null,
	);
	expect(store.hasRoute("/dashboard/sites/limeni/izpildshemas")).toBe(true);
	expect(store.hasRoute("/dashboard/sites/fima/acts")).toBe(true);
	expect(store.hasRoute("/dashboard/sites/limeni/settings")).toBe(false);
});
it("clears retained content and protections when access is removed or identity ends", () => {
	const store = createWorkspaceStore("user", "org");
	store.registerRoute(descriptor("a"), href("a"), "private");
	store.protect("a", "edit", true);
	store.remove("a");
	expect(store.isProtected("a")).toBe(false);
	store.registerRoute(descriptor("b"), href("b"), "private");
	store.clear();
	expect(store.getSnapshot()).toEqual([]);
});
it("opens standard construction diary and Forma 2 from the retained workspace", () => {
	const store = createWorkspaceStore("user", "org");
	store.registerRoute(
		descriptor("standard", { constructionWorkspace: true }),
		href("standard"),
		null,
	);
	expect(store.hasRoute("/dashboard/sites/standard/analytics")).toBe(true);
	expect(store.hasRoute("/dashboard/sites/standard/dashboard")).toBe(true);
	expect(store.hasRoute("/dashboard/sites/standard/izpildshemas")).toBe(false);
});
