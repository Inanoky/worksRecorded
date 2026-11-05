import { ArrowDown, ArrowRight, Check, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "@/components/landing/navigation/LandingLink";
import styles from "./Agents.module.css";
import {
	AGENT_MONTHLY_PRICE,
	AGENTS,
	LANDING_SECTIONS,
	SERVICES,
} from "./catalog";

type OfferingCopy = {
	title: string;
	question: string;
	description: string;
	points: string[];
	saving: string;
	savingLabel: string;
};

export function AgentGrid() {
	const t = useTranslations("AgentLanding");
	const locale = useLocale();

	return (
		<div className={styles.catalogGrid}>
			{AGENTS.map(({ id, icon: Icon, detailPath }, index) => {
				const copy = t.raw(`agents.${id}`) as OfferingCopy;
				return (
					<article className={styles.agentCard} id={id} key={id}>
						<div className={styles.cardTop}>
							<span className={styles.iconBox}>
								<Icon size={23} aria-hidden="true" />
							</span>
							<span className={styles.index}>
								{String(index + 1).padStart(2, "0")} / {t("agentLabel")}
							</span>
						</div>
						<p className={styles.cardCategory}>{copy.title}</p>
						<h2>{copy.question}</h2>
						<p className={styles.muted}>{copy.description}</p>
						<ul className={styles.checkList}>
							{copy.points.map((point) => (
								<li key={point}>
									<Check size={16} aria-hidden="true" />
									<span>{point}</span>
								</li>
							))}
						</ul>
						<div className={styles.saving}>
							<span>{t("potential")}</span>
							<strong>{copy.saving}</strong>
							<p>{copy.savingLabel}</p>
						</div>
						<div className={styles.cardFooter}>
							<div className={styles.cardLinks}>
								{detailPath ? (
									<Link href={`/${locale}${detailPath}`}>{t("learnMore")}</Link>
								) : null}
								<Link
									href={`/${locale}/Landing/ContactForm`}
									aria-label={t("enquireAgent", { agent: copy.title })}
								>
									{t("enquire")}
									<ArrowRight size={17} aria-hidden="true" />
								</Link>
							</div>
						</div>
					</article>
				);
			})}
		</div>
	);
}

export function MoreAgents() {
	const t = useTranslations("AgentLanding");
	const locale = useLocale();
	return (
		<div className={styles.moreAgents}>
			<div className={styles.moreIntro}>
				<p className={styles.eyebrow}>{t("moreEyebrow")}</p>
				<h3>{t("moreTitle")}</h3>
				<p className={styles.muted}>{t("moreDescription")}</p>
				<Link className={styles.textLink} href={`/${locale}/Landing/Agents`}>
					{t("allAgents")}
					<ArrowRight size={18} aria-hidden="true" />
				</Link>
			</div>
			<div>
				{AGENTS.slice(3).map(({ id, icon: Icon }) => {
					const copy = t.raw(`agents.${id}`) as OfferingCopy;
					return (
						<Link
							className={styles.agentRow}
							href={`/${locale}/Landing/Agents#${id}`}
							key={id}
						>
							<Icon size={22} aria-hidden="true" />
							<div>
								<h4>{copy.title}</h4>
								<p>{copy.question}</p>
							</div>
							<span>{copy.saving}</span>
							<ChevronRight size={17} aria-hidden="true" />
						</Link>
					);
				})}
			</div>
		</div>
	);
}

export function ServicesSection({ full = false }: { full?: boolean }) {
	const t = useTranslations("AgentLanding");
	const locale = useLocale();
	const Heading = full ? "h2" : "h3";
	return (
		<section
			className={`${styles.section} ${styles.services} ${full ? styles.serviceCatalog : ""}`}
		>
			{full ? null : (
				<div className={styles.sectionHeading}>
					<div>
						<p className={styles.eyebrow}>{t("servicesEyebrow")}</p>
						<h2>{t("servicesTitle")}</h2>
					</div>
				</div>
			)}
			<div className={styles.serviceGrid}>
				{SERVICES.map(({ id, icon: Icon }) => {
					const copy = t.raw(`services.${id}`) as OfferingCopy;
					const href =
						id === "bis" && locale === "lv"
							? "/lv/Landing/BIS-integracija"
							: `/${locale}/Landing/ContactForm`;
					return (
						<article id={id} className={styles.serviceCard} key={id}>
							<div className={styles.cardTop}>
								<Icon size={25} aria-hidden="true" />
								<span className={styles.index}>{t("serviceLabel")}</span>
							</div>
							<Heading>{copy.title}</Heading>
							<p className={styles.muted}>{copy.description}</p>
							<ul className={styles.checkList}>
								{copy.points.map((point) => (
									<li key={point}>
										<Check size={16} aria-hidden="true" />
										<span>{point}</span>
									</li>
								))}
							</ul>
							<div className={styles.serviceBottom}>
								<div>
									<span>{t("potential")}</span>
									<strong>{copy.saving}</strong>
									<p>{copy.savingLabel}</p>
								</div>
								<Link
									className={styles.roundLink}
									href={href}
									aria-label={t("enquireAgent", { agent: copy.title })}
								>
									<ArrowRight size={21} aria-hidden="true" />
								</Link>
							</div>
							{full ? (
								<Link
									className={styles.textLink}
									href={`/${locale}/Landing/ContactForm`}
								>
									{t("discussService")}
									<ArrowRight size={17} aria-hidden="true" />
								</Link>
							) : null}
						</article>
					);
				})}
			</div>
		</section>
	);
}

export function PriceSection() {
	const t = useTranslations("AgentLanding");
	const locale = useLocale();
	return (
		<section className={styles.pricePanel}>
			<div>
				<p className={styles.eyebrow}>{t("pricingEyebrow")}</p>
				<h2>{t("pricingTitle")}</h2>
				<p>{t("pricingDescription")}</p>
				<Link
					className={styles.lightButton}
					href={`/${locale}/Landing/ContactForm`}
				>
					{t("chooseAgent")}
					<ArrowRight size={18} aria-hidden="true" />
				</Link>
			</div>
			<div className={styles.priceAmount}>
				<p>{t("agentLabel")}</p>
				<div>
					<strong>{AGENT_MONTHLY_PRICE}</strong>
					<span>EUR</span>
				</div>
				<p>{t("perAgentMonth")}</p>
				<Link href={`/${locale}/Landing/Pricing`}>
					{t("pricingDetails")}
					<ArrowRight size={16} aria-hidden="true" />
				</Link>
			</div>
		</section>
	);
}

export function WorkflowSection() {
	const t = useTranslations("AgentLanding");
	const steps = t.raw("steps") as Array<{ title: string; description: string }>;
	return (
		<section className={styles.section} id={LANDING_SECTIONS.workflow}>
			<div className={styles.sectionHeading}>
				<div>
					<p className={styles.eyebrow}>{t("workflowEyebrow")}</p>
					<h2>{t("workflowTitle")}</h2>
				</div>
				<p className={styles.muted}>{t("workflowDescription")}</p>
			</div>
			<ol className={styles.steps}>
				{steps.map((step, index) => (
					<li key={step.title}>
						<div>
							<span>{String(index + 1).padStart(2, "0")}</span>
							<ArrowDown size={18} aria-hidden="true" />
						</div>
						<h3>{step.title}</h3>
						<p className={styles.muted}>{step.description}</p>
					</li>
				))}
			</ol>
		</section>
	);
}
