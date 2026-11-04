import "server-only";

import type { Metadata } from "next";
import { generateMetadata as about } from "@/app/[locale]/Landing/About/page";
import { generateMetadata as agents } from "@/app/[locale]/Landing/Agents/page";
import { generateMetadata as analytics } from "@/app/[locale]/Landing/Analytics/page";
import { generateMetadata as bis } from "@/app/[locale]/Landing/BIS-integracija/page";
import { generateMetadata as experience } from "@/app/[locale]/Landing/CaseStudies/[slug]/page";
import { generateMetadata as guide } from "@/app/[locale]/Landing/CaseStudies/how-to-track-construction-site-progress/page";
import { generateMetadata as experiences } from "@/app/[locale]/Landing/CaseStudies/page";
import { generateMetadata as contact } from "@/app/[locale]/Landing/ContactForm/layout";
import { generateMetadata as custom } from "@/app/[locale]/Landing/Custom/page";
import { generateMetadata as deletion } from "@/app/[locale]/Landing/DataDeletion/page";
import { generateMetadata as manufacturing } from "@/app/[locale]/Landing/Manufacturing/page";
import { generateMetadata as news } from "@/app/[locale]/Landing/News/page";
import { generateMetadata as pricing } from "@/app/[locale]/Landing/Pricing/page";
import { generateMetadata as privacy } from "@/app/[locale]/Landing/Privacy/page";
import { generateMetadata as services } from "@/app/[locale]/Landing/Services/page";
import { generateMetadata as diary } from "@/app/[locale]/Landing/SiteDiary/page";
import { generateMetadata as timesheets } from "@/app/[locale]/Landing/Timesheets/page";
import {
	getLandingRoute,
	LANDING_STATIC_PATHS,
	type LandingDocumentMetadata,
	type LandingMetadataMap,
} from "@/components/landing/navigation/landing-routes";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";

const generators = {
	"/Landing/About": about,
	"/Landing/Agents": agents,
	"/Landing/Analytics": analytics,
	"/Landing/BIS-integracija": bis,
	"/Landing/CaseStudies": experiences,
	"/Landing/CaseStudies/how-to-track-construction-site-progress": guide,
	"/Landing/ContactForm": contact,
	"/Landing/Custom": custom,
	"/Landing/DataDeletion": deletion,
	"/Landing/Manufacturing": manufacturing,
	"/Landing/News": news,
	"/Landing/Pricing": pricing,
	"/Landing/Privacy": privacy,
	"/Landing/Services": services,
	"/Landing/SiteDiary": diary,
	"/Landing/Timesheets": timesheets,
};

export function serializeLandingMetadata(
	metadata: Metadata,
): LandingDocumentMetadata {
	const baseUrl =
		metadata.metadataBase ||
		process.env.NEXT_PUBLIC_SITE_URL ||
		"https://www.worksrecorded.com";
	const absoluteUrl = (value: string | URL) => new URL(value, baseUrl).href;
	const title =
		typeof metadata.title === "string"
			? `${metadata.title} | WorksRecorded`
			: metadata.title && "absolute" in metadata.title
				? metadata.title.absolute
				: "WorksRecorded";
	const meta: Record<string, string[]> = {};
	if (metadata.description) meta.description = [metadata.description];
	if (metadata.keywords)
		meta.keywords = [
			Array.isArray(metadata.keywords)
				? metadata.keywords.join(",")
				: metadata.keywords,
		];
	for (const [key, value] of Object.entries(metadata.other || {})) {
		meta[key] = (Array.isArray(value) ? value : [value]).map(String);
	}
	const graph = metadata.openGraph;
	if (graph) {
		for (const key of [
			"title",
			"description",
			"url",
			"siteName",
			"locale",
			"type",
		] as const) {
			const value = key in graph ? graph[key as keyof typeof graph] : undefined;
			if (value)
				meta[`og:${key === "siteName" ? "site_name" : key}`] = [String(value)];
		}
		const images = graph.images
			? Array.isArray(graph.images)
				? graph.images
				: [graph.images]
			: [];
		meta["og:image"] = images.map((image) =>
			absoluteUrl(
				typeof image === "object" && "url" in image ? image.url : image,
			),
		);
		for (const key of ["width", "height", "alt"] as const) {
			meta[`og:image:${key}`] = images.flatMap((image) =>
				typeof image === "object" && "url" in image && image[key] !== undefined
					? [String(image[key])]
					: [],
			);
		}
		if (graph.alternateLocale)
			meta["og:locale:alternate"] = Array.isArray(graph.alternateLocale)
				? graph.alternateLocale
				: [graph.alternateLocale];
	}
	const twitter = metadata.twitter;
	if (twitter) {
		for (const key of ["title", "description", "card"] as const) {
			if (key in twitter)
				meta[`twitter:${key}`] = [String(twitter[key as keyof typeof twitter])];
		}
		const images = twitter.images
			? Array.isArray(twitter.images)
				? twitter.images
				: [twitter.images]
			: [];
		meta["twitter:image"] = images.map((image) =>
			absoluteUrl(
				typeof image === "object" && "url" in image ? image.url : image,
			),
		);
	}
	const links: LandingDocumentMetadata["links"] = [];
	if (metadata.alternates?.canonical)
		links.push({
			rel: "canonical",
			href: absoluteUrl(String(metadata.alternates.canonical)),
		});
	for (const [hrefLang, value] of Object.entries(
		metadata.alternates?.languages || {},
	)) {
		links.push({
			rel: "alternate",
			hrefLang,
			href: absoluteUrl(String(value)),
		});
	}
	return { title, meta, links };
}

export async function getLandingNavigationMetadata(
	locale: string,
): Promise<LandingMetadataMap> {
	const fallback = buildLandingMetadata({
		locale,
		path: "/Landing",
		title: "AI Agents for Builders | WorksRecorded",
		description:
			"AI agents for construction work records, financial analytics, WhatsApp automation, estimating and materials. EUR 150 per agent per month.",
		keywords: [
			"construction site records",
			"construction software",
			"construction cost control",
			"construction timesheets",
			"WorksRecorded",
		],
	});
	const entries = await Promise.all(
		LANDING_STATIC_PATHS.map(async (path) => {
			if (
				!getLandingRoute(
					new URL(`https://www.worksrecorded.com/${locale}${path}`),
				)
			)
				return null;
			const generator = generators[path as keyof typeof generators];
			const slug = path.split("/").at(-1) || "";
			const isExperience = ["Limeni", "FIMA", "TGEM", "StoneAndTree"].includes(
				slug,
			);
			const metadata = isExperience
				? await experience({ params: Promise.resolve({ locale, slug }) })
				: generator
					? await generator({
							params: Promise.resolve({ locale }),
							children: null,
						})
					: fallback;
			return [path, serializeLandingMetadata(metadata)] as const;
		}),
	);
	return Object.fromEntries(entries.filter((entry) => entry !== null));
}
