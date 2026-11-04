export const LANDING_LOCALES = ["lv", "en", "ru"] as const;

export type LandingLocale = (typeof LANDING_LOCALES)[number];

export const LANDING_STATIC_PATHS = [
	"/Landing",
	"/Landing/About",
	"/Landing/Agents",
	"/Landing/Analytics",
	"/Landing/BIS-integracija",
	"/Landing/CaseStudies",
	"/Landing/CaseStudies/Article_1",
	"/Landing/CaseStudies/Article_2_AI_construction",
	"/Landing/CaseStudies/Deprom",
	"/Landing/CaseStudies/LEC",
	"/Landing/CaseStudies/U-fix",
	"/Landing/CaseStudies/how-to-track-construction-site-progress",
	"/Landing/CaseStudies/Limeni",
	"/Landing/CaseStudies/FIMA",
	"/Landing/CaseStudies/TGEM",
	"/Landing/CaseStudies/StoneAndTree",
	"/Landing/ContactForm",
	"/Landing/Custom",
	"/Landing/DataDeletion",
	"/Landing/Manufacturing",
	"/Landing/News",
	"/Landing/Pricing",
	"/Landing/Privacy",
	"/Landing/Services",
	"/Landing/SiteDiary",
	"/Landing/ThankYou",
	"/Landing/Timesheets",
] as const;

const staticPaths = new Set<string>(LANDING_STATIC_PATHS);

export type LandingRoute = {
	locale: LandingLocale;
	path: string;
	href: string;
	key: string;
	page: number;
	articleId?: number;
};

export function isLandingLocale(locale: string): locale is LandingLocale {
	return LANDING_LOCALES.some((candidate) => candidate === locale);
}

export function getLandingRoute(url: URL): LandingRoute | null {
	const match = url.pathname
		.replace(/\/$/, "")
		.match(/^\/(lv|en|ru)(\/Landing(?:\/.*)?)$/);
	if (!match || !isLandingLocale(match[1])) return null;
	const [, locale, path] = match;
	if (path === "/Landing/BIS-integracija" && locale !== "lv") return null;
	if (
		path.endsWith("/how-to-track-construction-site-progress") &&
		locale === "ru"
	)
		return null;
	const articleMatch = path.match(/^\/Landing\/News\/([1-9]\d*)$/);
	const articleId = articleMatch ? Number(articleMatch[1]) : undefined;
	if (!staticPaths.has(path) && !Number.isSafeInteger(articleId)) return null;
	const requestedPage = Number(url.searchParams.get("page") || 1);
	const page =
		Number.isFinite(requestedPage) && requestedPage >= 1
			? Math.floor(requestedPage)
			: 1;
	const key = `/${locale}${path}${path === "/Landing/News" ? `?page=${page}` : ""}`;
	return {
		locale,
		path,
		href: url.pathname + url.search + url.hash,
		key,
		page,
		articleId,
	};
}

export type LandingDocumentMetadata = {
	title: string;
	meta: Record<string, string[]>;
	links: { rel: string; href: string; hrefLang?: string }[];
};

export type LandingMetadataMap = Record<string, LandingDocumentMetadata>;
