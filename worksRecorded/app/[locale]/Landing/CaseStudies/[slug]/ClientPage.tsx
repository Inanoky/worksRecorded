"use client";

import Image from "next/image";
import { notFound } from "next/navigation";
import { useLocale } from "next-intl";
import styles from "@/components/landing/agents/Agents.module.css";
import Link from "@/components/landing/navigation/LandingLink";

import {
	getCustomerExperiences,
	getExperiencePageCopy,
} from "../_data/customerExperiences";

function getExperience(locale: string, slug: string) {
	const experience = getCustomerExperiences(locale).find(
		(study) => study.slug === slug,
	);
	if (!experience) notFound();
	return experience;
}

export default function CustomerExperiencePage({ slug }: { slug: string }) {
	const locale = useLocale();
	const experience = getExperience(locale, slug);
	const copy = getExperiencePageCopy(locale);
	return (
		<main className={styles.page}>
			<article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
				<Link
					href={`/${locale}/Landing/CaseStudies`}
					className="text-sm underline underline-offset-4"
				>
					{copy.back}
				</Link>
				<header className="mt-8 space-y-6">
					<div className="inline-flex max-w-full rounded-xl border bg-white p-4">
						<Image
							src={experience.logo}
							alt={experience.company}
							width={240}
							height={96}
							className="h-16 w-48 max-w-full object-contain"
						/>
					</div>
					<p className="text-sm font-semibold">{experience.company}</p>
					<h1 className="max-w-[680px] text-balance text-3xl font-semibold sm:text-5xl">
						{experience.title}
					</h1>
					<p className="max-w-[680px] text-pretty text-lg leading-7">
						{experience.excerpt}
					</p>
				</header>
				<div className="mt-12 space-y-8 text-pretty text-base leading-6">
					<section className="space-y-4">
						<h2 className="text-2xl font-semibold">{copy.context}</h2>
						<p>{experience.context}</p>
					</section>
					<section className="space-y-4">
						<h2 className="text-2xl font-semibold">{copy.solution}</h2>
						<p>{experience.solution}</p>
					</section>
					<section className="space-y-4">
						<h2 className="text-2xl font-semibold">{copy.features}</h2>
						<ul className="list-disc space-y-3 pl-6">
							{experience.features.map((feature) => (
								<li key={feature}>{feature}</li>
							))}
						</ul>
					</section>
					<section className="space-y-4">
						<h2 className="text-2xl font-semibold">{copy.outcome}</h2>
						<p>{experience.outcome}</p>
					</section>
				</div>
				<div className="mt-12">
					<Link
						href={`/${locale}/Landing/ContactForm`}
						className={styles.primaryButton}
						data-landing-pressable
					>
						{copy.cta}
					</Link>
				</div>
			</article>
		</main>
	);
}
