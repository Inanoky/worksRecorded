import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";
import { getCustomerExperiences } from "../_data/customerExperiences";
import ClientPage from "./ClientPage";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

function getExperience(locale: string, slug: string) {
	const experience = getCustomerExperiences(locale).find(
		(study) => study.slug === slug,
	);
	if (!experience) notFound();
	return experience;
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale, slug } = await params;
	const experience = getExperience(locale, slug);
	return buildLandingMetadata({
		locale,
		path: `/Landing/CaseStudies/${experience.slug}`,
		title: `${experience.company} | ${experience.title} | WorksRecorded`,
		description: experience.excerpt,
		keywords: [experience.company, "WorksRecorded", ...experience.tags],
	});
}

export default async function Page({ params }: PageProps) {
	const { locale, slug } = await params;
	getExperience(locale, slug);
	return <ClientPage slug={slug} />;
}
