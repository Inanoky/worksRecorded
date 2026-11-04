import { ArrowDown, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "@/components/landing/navigation/LandingLink";
import { useTranslations } from "next-intl";
import ConstructionAgent from "@/public/frontend/pages/Home/ConstructionAgent.png";
import { Logos } from "../Logos";
import {
	MoreAgents,
	PriceSection,
	ServicesSection,
	WorkflowSection,
} from "./AgentSections";
import styles from "./Agents.module.css";
import { DEMO_URL, LANDING_SECTIONS } from "./catalog";
import { SavingsOverview } from "./SavingsOverview";
import { TeamSection } from "./TeamSection";

export default function AgentLandingPage() {
	const t = useTranslations("AgentLanding");
	return (
		<main className={styles.page}>
			<section className={`${styles.container} ${styles.hero}`}>
				<div>
					<h1>
						{t("title")} <span>{t("titleHighlight")}</span>
					</h1>
					<p className={styles.heroDescription}>{t("description")}</p>
					<div className={styles.heroActions}>
						<Link
							className={styles.primaryButton}
							data-landing-pressable
							href={DEMO_URL}
							target="_blank"
							rel="noopener noreferrer"
						>
							{t("bookDemo")}
							<ArrowRight size={18} aria-hidden="true" />
						</Link>
						<Link
							className={styles.textLink}
							href={`#${LANDING_SECTIONS.agents}`}
						>
							{t("exploreAgents")}
							<ArrowDown size={17} aria-hidden="true" />
						</Link>
					</div>
				</div>
				<Image
					src={ConstructionAgent}
					alt={t("heroImageAlt")}
					className={styles.heroPortrait}
					sizes="(max-width: 600px) 90vw, 520px"
					preload
				/>
			</section>
			<div className={styles.trust}>
				<Logos />
			</div>
			<div className={styles.container}>
				<section id={LANDING_SECTIONS.agents} className={styles.section}>
					<div className={styles.sectionHeading}>
						<h2>{t("agentsTitle")}</h2>
					</div>
					<SavingsOverview />
					<MoreAgents />
				</section>
				<WorkflowSection />
				<PriceSection />
				<ServicesSection />
				<TeamSection />
			</div>
		</main>
	);
}
