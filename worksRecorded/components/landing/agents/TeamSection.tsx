import Image from "next/image";
import { useTranslations } from "next-intl";
import { useId } from "react";
import DeividsBerkolds from "@/public/frontend/pages/Team/DeividsBerkolds.png";
import VjaceslavsGromatovics from "@/public/frontend/pages/Team/VjaceslavsGromatovics.png";
import layoutStyles from "./Agents.module.css";
import { LANDING_SECTIONS } from "./catalog";
import styles from "./TeamSection.module.css";

export function TeamSection() {
	const t = useTranslations("AgentLanding.team");
	const headingId = useId();

	return (
		<section
			id={LANDING_SECTIONS.team}
			className={styles.teamSection}
			aria-labelledby={headingId}
		>
			<div className={styles.teamIntro}>
				<p className={layoutStyles.eyebrow}>{t("eyebrow")}</p>
				<h2 id={headingId}>{t("title")}</h2>
				<p className={styles.description}>{t("description")}</p>
			</div>
			<div className={styles.teamMembers}>
				<figure>
					<div className={styles.teamPortrait}>
						<Image
							src={DeividsBerkolds}
							alt="Deivids Berkolds"
							sizes="(max-width: 540px) 40vw, (max-width: 800px) 21vw, 182px"
						/>
					</div>
					<figcaption>
						<h3>Deivids Berkolds</h3>
						<p>CTO</p>
					</figcaption>
				</figure>
				<figure>
					<div className={`${styles.teamPortrait} ${styles.teamPortraitCeo}`}>
						<Image
							src={VjaceslavsGromatovics}
							alt="Vjaceslavs Gromatovics"
							sizes="(max-width: 540px) 45vw, (max-width: 800px) 24vw, 211px"
						/>
					</div>
					<figcaption>
						<h3>Vjaceslavs Gromatovics</h3>
						<p>CEO</p>
					</figcaption>
				</figure>
			</div>
		</section>
	);
}
