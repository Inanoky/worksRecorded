import { ArrowRight } from "lucide-react";
import Link from "@/components/landing/navigation/LandingLink";
import { useLocale, useTranslations } from "next-intl";
import styles from "./Agents.module.css";

type SavingsCopy = {
	title: string;
	amount: string;
	label: string;
	description: string;
};

export function SavingsOverview() {
	const t = useTranslations("AgentLanding");
	const locale = useLocale();
	const savings = t.raw("savings") as SavingsCopy[];

	return (
		<>
			<div className={styles.savingsGrid}>
				{savings.map((saving) => (
					<article className={styles.savingsCard} key={saving.title}>
						<h3 className={styles["heading-5"]}>{saving.title}</h3>
						<div className={styles.savingMetric}>
							<strong>{saving.amount}</strong>
							<span>{saving.label}</span>
						</div>
						<p className={styles["body-6"]}>{saving.description}</p>
					</article>
				))}
			</div>
			<div className={styles.savingsAction}>
				<Link
					className={styles.primaryButton}
					href={`/${locale}/Landing/ContactForm`}
				>
					{t("discussSavings")}
					<ArrowRight size={18} aria-hidden="true" />
				</Link>
			</div>
		</>
	);
}
