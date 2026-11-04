"use client";

import type { ReactNode } from "react";
import type { StoredNewsArticle } from "@/lib/news/store";
import type { LandingDocumentMetadata, LandingRoute } from "./landing-routes";

export type LoadedLandingPage = {
	render: () => ReactNode;
	metadata?: LandingDocumentMetadata;
};

const loaders: Record<string, () => Promise<LoadedLandingPage>> = {
	"/Landing": () =>
		import("@/app/[locale]/Landing/ClientPage").then(({ default: Page }) => ({
			render: () => <Page />,
		})),
	"/Landing/About": () =>
		import("@/app/[locale]/Landing/About/ClientPage").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/Agents": () =>
		import("@/app/[locale]/Landing/Agents/ClientPage").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/Analytics": () =>
		import("@/app/[locale]/Landing/Analytics/ClientPage").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/BIS-integracija": () =>
		import("@/app/[locale]/Landing/BIS-integracija/ClientPage").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/CaseStudies": () =>
		import("@/app/[locale]/Landing/CaseStudies/ClientPage").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/CaseStudies/Article_1": () =>
		import("@/app/[locale]/Landing/CaseStudies/Article_1/page").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/CaseStudies/Article_2_AI_construction": () =>
		import(
			"@/app/[locale]/Landing/CaseStudies/Article_2_AI_construction/page"
		).then(({ default: Page }) => ({ render: () => <Page /> })),
	"/Landing/CaseStudies/Deprom": () =>
		import("@/app/[locale]/Landing/CaseStudies/Deprom/page").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/CaseStudies/LEC": () =>
		import("@/app/[locale]/Landing/CaseStudies/LEC/page").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/CaseStudies/U-fix": () =>
		import("@/app/[locale]/Landing/CaseStudies/U-fix/page").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/CaseStudies/how-to-track-construction-site-progress": () =>
		import(
			"@/app/[locale]/Landing/CaseStudies/how-to-track-construction-site-progress/ClientPage"
		).then(({ default: Page }) => ({ render: () => <Page /> })),
	"/Landing/ContactForm": () =>
		import("@/app/[locale]/Landing/ContactForm/page").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/Custom": () =>
		import("@/app/[locale]/Landing/Custom/ClientPage").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/DataDeletion": () =>
		import("@/app/[locale]/Landing/DataDeletion/ClientPage").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/Manufacturing": () =>
		import("@/app/[locale]/Landing/Manufacturing/ClientPage").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/Pricing": () =>
		import("@/app/[locale]/Landing/Pricing/ClientPage").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/Privacy": () =>
		import("@/app/[locale]/Landing/Privacy/ClientPage").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/Services": () =>
		import("@/app/[locale]/Landing/Services/ClientPage").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/SiteDiary": () =>
		import("@/app/[locale]/Landing/SiteDiary/ClientPage").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/ThankYou": () =>
		import("@/app/[locale]/Landing/ThankYou/page").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
	"/Landing/Timesheets": () =>
		import("@/app/[locale]/Landing/Timesheets/ClientPage").then(
			({ default: Page }) => ({ render: () => <Page /> }),
		),
};

type NewsList = {
	articles: StoredNewsArticle[];
	totalArticles: number;
	currentPage: number;
};

async function readNews<T>(query: string): Promise<T> {
	const response = await fetch(`/api/landing/news?${query}`);
	if (!response.ok) throw new Error("Unable to load news");
	return response.json();
}

async function loadPage(route: LandingRoute): Promise<LoadedLandingPage> {
	if (route.articleId) {
		const [{ default: Page }, data] = await Promise.all([
			import("@/app/[locale]/Landing/News/[id]/ClientPage"),
			readNews<{
				article: StoredNewsArticle;
				metadata: LandingDocumentMetadata;
			}>(
				new URLSearchParams({
					locale: route.locale,
					id: String(route.articleId),
				}).toString(),
			),
		]);
		return {
			render: () => <Page article={data.article} />,
			metadata: data.metadata,
		};
	}
	if (route.path === "/Landing/News") {
		const [{ default: Page }, data] = await Promise.all([
			import("@/app/[locale]/Landing/News/ClientPage"),
			readNews<NewsList>(
				new URLSearchParams({
					locale: route.locale,
					page: String(route.page),
				}).toString(),
			),
		]);
		return { render: () => <Page {...data} /> };
	}
	if (
		["Limeni", "FIMA", "TGEM", "StoneAndTree"].includes(
			route.path.split("/").at(-1) || "",
		)
	) {
		const { default: Page } = await import(
			"@/app/[locale]/Landing/CaseStudies/[slug]/ClientPage"
		);
		return { render: () => <Page slug={route.path.split("/").at(-1) || ""} /> };
	}
	return loaders[route.path]();
}

const pages = new Map<
	string,
	{ promise: Promise<LoadedLandingPage>; expiresAt: number }
>();

export function preloadLandingPage(
	route: LandingRoute,
): Promise<LoadedLandingPage> {
	const existing = pages.get(route.key);
	if (existing && existing.expiresAt > Date.now()) return existing.promise;
	const promise = loadPage(route).catch((error) => {
		if (pages.get(route.key)?.promise === promise) pages.delete(route.key);
		throw error;
	});
	pages.set(route.key, {
		promise,
		expiresAt: route.path.startsWith("/Landing/News")
			? Date.now() + 300_000
			: Infinity,
	});
	return promise;
}
