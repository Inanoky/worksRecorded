"use client";

import { useTranslations } from "next-intl";
import {
	AgentGrid,
	PriceSection,
} from "@/components/landing/agents/AgentSections";
import styles from "@/components/landing/agents/Agents.module.css";
import { AGENTS } from "@/components/landing/agents/catalog";
import Link from "@/components/landing/navigation/LandingLink";

export default function AgentsPage() {
	const t = useTranslations("AgentLanding");
	return (
		<main className={styles.page}>
			<div className={styles.container}>
				<section className={styles.pageIntro}>
					<p className={styles.eyebrow}>{t("eyebrow")}</p>
					<h1>{t("catalogTitle")}</h1>
					<p className={styles.muted}>{t("catalogDescription")}</p>
					<nav className={styles.jumpLinks} aria-label={t("nav.agents")}>
						{AGENTS.map(({ id }) => (
							<Link key={id} href={`#${id}`}>
								{t(`agents.${id}.title`)}
							</Link>
						))}
					</nav>
				</section>
				<section className={styles.catalogSection} aria-label={t("nav.agents")}>
					<AgentGrid />
				</section>
				<div className={styles.catalogSection}>
					<PriceSection />
				</div>
			</div>
		</main>
	);
}
