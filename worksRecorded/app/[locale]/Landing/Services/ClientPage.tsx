"use client";

import { useTranslations } from "next-intl";

import { ServicesSection } from "@/components/landing/agents/AgentSections";

import styles from "@/components/landing/agents/Agents.module.css";

export default function ServicesPage() {
	const t = useTranslations("AgentLanding");
	return (
		<main className={styles.page}>
			<div className={styles.container}>
				<section className={styles.pageIntro}>
					<p className={styles.eyebrow}>{t("nav.services")}</p>
					<h1>{t("servicesPageTitle")}</h1>
					<p className={styles.muted}>{t("servicesPageDescription")}</p>
				</section>
				<ServicesSection full />
			</div>
		</main>
	);
}
