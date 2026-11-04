"use client";

import Image from "next/image";
import { useLocale } from "next-intl";

import Link from "@/components/landing/navigation/LandingLink";

import { getCaseStudies } from "./_data/caseStudies";

import { getExperiencePageCopy } from "./_data/customerExperiences";

export default function CaseStudiesPage() {
	const locale = useLocale();
	const copy = getExperiencePageCopy(locale);
	const caseStudies = getCaseStudies(locale);
	return (
		<main className="mx-auto max-w-6xl px-6 py-12">
			<div className="mb-10">
				<h1 className="text-3xl font-semibold">{copy.title}</h1>
				<p className="mt-2 text-muted-foreground">{copy.description}</p>
			</div>

			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{caseStudies.map((cs) => (
					<Link
						key={cs.slug}
						href={`/${locale}/Landing/CaseStudies/${cs.slug}`}
						className="group min-w-0 rounded-2xl border bg-background p-4 shadow-sm transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 active:translate-y-px motion-reduce:transform-none"
					>
						<div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-xl bg-muted">
							{cs.coverImage ? (
								cs.logoCover ? (
									<div className="absolute inset-0 flex items-center justify-center bg-white p-6">
										<div className="relative h-24 w-full max-w-64">
											{cs.slug === "TGEM" &&
											typeof cs.coverImage !== "string" ? (
												<svg
													viewBox="38 164 677 191"
													role="img"
													aria-label={cs.company}
													className="h-full w-full"
												>
													<image
														href={cs.coverImage.src}
														width="800"
														height="566"
													/>
												</svg>
											) : (
												<Image
													src={cs.coverImage}
													alt={cs.company}
													fill
													sizes="256px"
													className="object-contain"
												/>
											)}
										</div>
									</div>
								) : (
									<Image
										src={cs.coverImage}
										alt={cs.title}
										fill
										sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
										className="object-cover"
									/>
								)
							) : null}
						</div>

						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<span className="font-medium text-foreground">{cs.company}</span>
							{cs.location ? <span>• {cs.location}</span> : null}
						</div>

						<h2 className="mt-2 text-lg font-semibold leading-snug">
							{cs.title}
						</h2>

						<p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
							{cs.excerpt}
						</p>

						{cs.tags?.length ? (
							<div className="mt-4 flex flex-wrap gap-2">
								{cs.tags.slice(0, 3).map((tag) => (
									<span
										key={tag}
										className="rounded-full border px-2 py-1 text-xs text-muted-foreground"
									>
										{tag}
									</span>
								))}
							</div>
						) : null}
					</Link>
				))}
			</div>
		</main>
	);
}
