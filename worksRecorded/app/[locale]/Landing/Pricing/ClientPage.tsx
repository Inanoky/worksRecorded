"use client";

import { ArrowRight, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PriceSection } from "@/components/landing/agents/AgentSections";
import styles from "@/components/landing/agents/Agents.module.css";
import { AGENT_MONTHLY_PRICE } from "@/components/landing/agents/catalog";
import Link from "@/components/landing/navigation/LandingLink";

export default function PricingPage() {
	const locale = useLocale();
	const t = useTranslations("AgentLanding");
	const included = t.raw("pricingIncludes") as string[];
	return (
		<main className={styles.page}>
			<div className={styles.container}>
				<section className={styles.pricingHero}>
					<div className={styles.pageIntro}>
						<p className={styles.eyebrow}>{t("nav.pricing")}</p>
						<h1>{t("pricingPageTitle")}</h1>
					</div>
					<PriceSection />
				</section>
				<section className={styles.pricingInfo}>
					<div>
						<h2>{t("pricingIncludesTitle")}</h2>
						<ul className={styles.checkList}>
							{included.map((item) => (
								<li key={item}>
									<Check size={17} aria-hidden="true" />
									<span>{item}</span>
								</li>
							))}
						</ul>
						<Link
							className={styles.textLink}
							href={`/${locale}/Landing/Agents`}
						>
							{t("allAgents")}
							<ArrowRight size={18} aria-hidden="true" />
						</Link>
					</div>
					<div>
						<h2>{t("pricingExampleTitle")}</h2>
						<p>
							{t("pricingExample", {
								two: AGENT_MONTHLY_PRICE * 2,
								three: AGENT_MONTHLY_PRICE * 3,
							})}
						</p>
						<p>{t("pricingServicesNote")}</p>
						<Link
							className={styles.textLink}
							href={`/${locale}/Landing/Services`}
						>
							{t("nav.allServices")}
							<ArrowRight size={18} aria-hidden="true" />
						</Link>
					</div>
				</section>
			</div>
		</main>
	);
}
