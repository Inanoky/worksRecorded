"use client";

import { notFound } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "@/components/landing/navigation/LandingLink";

import { guidePath, progressGuide } from "./content";

const siteUrl = "https://www.worksrecorded.com";

const checklistId = "daily-checklist";

function getGuide(locale: string) {
	if (locale !== "en" && locale !== "lv") notFound();
	return progressGuide[locale];
}

export default function ConstructionProgressGuide() {
	const locale = useLocale();
	const guide = getGuide(locale);
	const otherLocale = locale === "lv" ? "en" : "lv";
	const structuredData = {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: guide.title,
		description: guide.description,
		inLanguage: locale,
		mainEntityOfPage: `${siteUrl}/${locale}${guidePath}`,
		author: { "@type": "Organization", name: "WorksRecorded", url: siteUrl },
		publisher: { "@type": "Organization", name: "WorksRecorded", url: siteUrl },
	};
	return (
		<main
			lang={locale}
			className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16"
		>
			<script type="application/ld+json">
				{JSON.stringify(structuredData).replace(/</g, "\\u003c")}
			</script>
			<div className="mb-10 flex flex-wrap items-center justify-between gap-4 text-sm">
				<Link
					className="underline underline-offset-4"
					href={`/${locale}/Landing/CaseStudies`}
				>
					{guide.back}
				</Link>
				<Link
					className="rounded-full border px-4 py-2 hover:bg-muted"
					href={`/${otherLocale}${guidePath}`}
					hrefLang={otherLocale}
					lang={otherLocale}
				>
					{otherLocale === "lv" ? "Lasīt latviski" : "Read in English"}
				</Link>
			</div>
			<article className="space-y-10 text-foreground">
				<header className="space-y-5">
					<p className="text-sm font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">
						{guide.label}
					</p>
					<h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
						{guide.title}
					</h1>
					<p className="text-sm text-muted-foreground">WorksRecorded</p>
					<p className="text-lg leading-8">{guide.intro}</p>
					<p className="rounded-2xl border border-teal-200 bg-teal-50 p-6 text-lg leading-8 text-teal-950 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-50">
						{guide.answer}
					</p>
				</header>
				<nav aria-label={guide.contents} className="rounded-2xl border p-6">
					<h2 className="mb-4 text-lg font-semibold">{guide.contents}</h2>
					<ul className="space-y-3">
						{guide.sections.map((section) => (
							<li key={section.id}>
								<a
									className="underline underline-offset-4"
									href={`#${section.id}`}
								>
									{section.title}
								</a>
							</li>
						))}
						<li>
							<a
								className="underline underline-offset-4"
								href={`#${checklistId}`}
							>
								{guide.checklistTitle}
							</a>
						</li>
					</ul>
				</nav>
				{guide.sections.map((section) => (
					<section
						key={section.id}
						id={section.id}
						className="scroll-mt-28 space-y-5"
					>
						<h2 className="text-2xl font-semibold leading-snug">
							{section.title}
						</h2>
						{section.paragraphs.map((paragraph) => (
							<p key={paragraph} className="text-base leading-8 sm:text-lg">
								{paragraph}
							</p>
						))}
						{section.bullets && (
							<ul className="list-disc space-y-3 pl-6 leading-7">
								{section.bullets.map((bullet) => (
									<li key={bullet}>{bullet}</li>
								))}
							</ul>
						)}
						{section.id === "labour-cost-control" && (
							<div className="space-y-5 rounded-2xl border bg-muted/30 p-4 sm:p-6">
								<h3 className="text-xl font-semibold">{guide.example.title}</h3>
								<p className="leading-7">{guide.example.intro}</p>
								<div className="overflow-x-auto rounded-lg border">
									<table className="w-full min-w-[32rem] border-collapse text-left text-sm">
										<caption className="sr-only">{guide.example.title}</caption>
										<thead className="bg-muted">
											<tr>
												{guide.example.headers.map((header) => (
													<th
														key={header}
														scope="col"
														className="px-4 py-3 font-semibold"
													>
														{header}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{guide.example.rows.map(
												([label, calculation, result]) => (
													<tr key={label} className="border-t">
														<th scope="row" className="px-4 py-3 font-medium">
															{label}
														</th>
														<td className="whitespace-nowrap px-4 py-3">
															{calculation}
														</td>
														<td className="whitespace-nowrap px-4 py-3 font-semibold">
															{result}
														</td>
													</tr>
												),
											)}
										</tbody>
									</table>
								</div>
								<p className="leading-7">{guide.example.conclusion}</p>
								<p className="text-sm leading-6 text-muted-foreground">
									{guide.example.caution}
								</p>
							</div>
						)}
					</section>
				))}
				<section id={checklistId} className="scroll-mt-28 space-y-5">
					<h2 className="text-2xl font-semibold">{guide.checklistTitle}</h2>
					<ul className="list-disc space-y-3 pl-6 leading-7">
						{guide.checklist.map((item) => (
							<li key={item}>{item}</li>
						))}
					</ul>
					<h3 className="text-xl font-semibold">{guide.sampleTitle}</h3>
					<blockquote className="border-l-4 border-teal-600 bg-muted/30 p-6 leading-8">
						{guide.sample}
					</blockquote>
				</section>
				<section className="space-y-6">
					<h2 className="text-2xl font-semibold">{guide.faqTitle}</h2>
					{guide.faqs.map((faq) => (
						<div key={faq.question} className="space-y-2">
							<h3 className="text-lg font-semibold">{faq.question}</h3>
							<p className="leading-8">{faq.answer}</p>
						</div>
					))}
				</section>
				<aside className="space-y-5 rounded-2xl border p-6 sm:p-8">
					<h2 className="text-2xl font-semibold">{guide.productTitle}</h2>
					<p className="leading-8">{guide.productDescription}</p>
					<ul className="space-y-3">
						{guide.links.map((link) => (
							<li key={link.path}>
								<Link
									className="underline underline-offset-4"
									href={`/${locale}/Landing/${link.path}`}
								>
									{link.label}
								</Link>
							</li>
						))}
					</ul>
					<Link
						className="inline-flex rounded-xl bg-teal-800 px-5 py-3 font-semibold text-white hover:bg-teal-900"
						href={`/${locale}/Landing/ContactForm`}
					>
						{guide.cta}
					</Link>
				</aside>
			</article>
		</main>
	);
}
