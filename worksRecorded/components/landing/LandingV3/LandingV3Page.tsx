"use client";

import {
	LoginLink,
} from "@kinde-oss/kinde-auth-nextjs/components";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import {
	ArrowDownRight,
	ArrowRight,
	BarChart3,
	Camera,
	CheckCircle2,
	FileText,
	Mic2,
	Play,
} from "lucide-react";
import { Archivo, Barlow_Condensed } from "next/font/google";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import HeroLaptopDashboard from "@/public/frontend/pages/Home/HeroLaptopDashboardDiagram.png";
import HeroWhatsAppPhone from "@/public/frontend/pages/Home/HeroWhatsAppPhoneSource.png";
import ScreenshotSiteDiary from "@/public/frontend/pages/Home/ScreenshotSiteDiary.png";
import DepromLogo from "@/public/logos/deprom.webp";
import LecLogo from "@/public/logos/lec.png";
import ZtcLogo from "@/public/logos/ztc.jpg";
import styles from "./LandingV3.module.css";

const archivo = Archivo({
	subsets: ["latin"],
	variable: "--font-v3-body",
});

const barlowCondensed = Barlow_Condensed({
	subsets: ["latin"],
	weight: ["500", "600", "700"],
	variable: "--font-v3-label",
});

const CALENDLY_URL =
	"https://calendly.com/vjaceslavs-worksrecorded/30min?month=2026-05";

type BudgetFlow = {
	problem: string;
	solution: string;
	outcome: string;
};

type TextItem = {
	title: string;
	desc?: string;
};

type LaptopFrameProps = {
	src: StaticImageData;
	alt: string;
	priority?: boolean;
	objectClassName?: string;
};

const clients = [
	{
		name: "Deprom",
		logo: DepromLogo,
		href: "https://deprom.lv/",
	},
	{
		name: "LEC",
		logo: LecLogo,
		href: "https://www.lec.lv/",
	},
	{
		name: "ZTC",
		logo: ZtcLogo,
		href: "https://ztc.lv/",
	},
];

function LaptopFrame({
	src,
	alt,
	priority = false,
	objectClassName = "object-cover object-top",
}: LaptopFrameProps) {
	return (
		<div className={styles.laptop}>
			<div className={styles.laptopScreen}>
				<Image
					src={src}
					alt={alt}
					fill
					priority={priority}
					placeholder="blur"
					sizes="(min-width: 1024px) 68vw, 94vw"
					className={objectClassName}
				/>
			</div>
			<div className={styles.laptopBase} aria-hidden="true">
				<span />
			</div>
		</div>
	);
}

function PhoneFrame({
	alt,
	priority = false,
}: {
	alt: string;
	priority?: boolean;
}) {
	return (
		<div className={styles.phone}>
			<Image
				src={HeroWhatsAppPhone}
				alt={alt}
				fill
				priority={priority}
				sizes="(min-width: 1024px) 17vw, 42vw"
				className={styles.phoneImage}
			/>
		</div>
	);
}

function MeasureRail() {
	return <span className={styles.measureRail} aria-hidden="true" />;
}

function LandingButton({
	href,
	children,
	secondary = false,
}: {
	href: string;
	children: React.ReactNode;
	secondary?: boolean;
}) {
	return (
		<Link
			href={href}
			target={href.startsWith("http") ? "_blank" : undefined}
			rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
			className={
				secondary
					? styles.secondaryButton
					: styles.primaryButton
			}
		>
			{children}
			<ArrowRight className="size-4" aria-hidden="true" />
		</Link>
	);
}

export default function LandingV3Page() {
	const [videoPlaying, setVideoPlaying] = useState(false);
	const locale = useLocale();
	const landing = useTranslations("LandingPageDesktop");
	const text = useTranslations("LandingText");
	const nav = useTranslations("Navigation");
	const auth = useTranslations("AuthButtons");
	const budgetFlows = landing.raw("budgetSection.flows") as BudgetFlow[];
	const howItems = text.raw("howDoWeDoThat.items") as TextItem[];
	const whyBullets = text.raw("why.bullets") as string[];
	const videoSrc =
		locale === "lv"
			? "https://www.youtube-nocookie.com/embed/i0vXRFjvogA?rel=0&modestbranding=1&playsinline=1"
			: "https://www.youtube-nocookie.com/embed/-CfwJd-hI4I?rel=0&modestbranding=1&playsinline=1";
	const contactHref = `/${locale}/Landing/ContactForm`;

	return (
		<main
			className={`${archivo.variable} ${barlowCondensed.variable} ${styles.page}`}
		>
			<span
				className="sr-only"
				aria-hidden="true"
				dangerouslySetInnerHTML={{
					__html:
						"<!-- THESIS: A field update becomes management evidence in one visible chain; this refuses the centered generic SaaS hero. OWN-WORLD: white and mineral-green drawing fields, forest lines, charcoal grotesk type, real black devices, square technical controls. STORY: understand WhatsApp input, trust the structured record, see cost control, book a demo. FIRST VIEWPORT: narrow copy rail left; oversized dashboard right; phone overlaps the screen; three leader lines terminate under the product; primary action remains beside the offer. FORM: dashboard-led construction review, position 5, seed 4ea976f6. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md -->",
				}}
			/>

			<header className={styles.header}>
				<div className={styles.headerInner}>
					<Link
						href={`/${locale}/Landing_V3`}
						className={styles.wordmark}
						aria-label="WorksRecorded"
					>
						Works<span>Recorded</span>
					</Link>

					<nav className={styles.desktopNav} aria-label="Primary">
						<a href="#workflow">{nav("features")}</a>
						<a href="#budget">{text("why.heading")}</a>
						<a href="#proof">{landing("clientsHeading")}</a>
					</nav>

					<div className={styles.headerActions}>
						<LanguageSwitcher />
						<div className="hidden sm:block">
							<LoginLink>
								<button type="button" className={styles.loginButton}>
									{auth("signIn")}
								</button>
							</LoginLink>
						</div>
						<LandingButton href={CALENDLY_URL}>
							<span className="hidden sm:inline">{landing("bookDemo")}</span>
							<span className="sm:hidden">Demo</span>
						</LandingButton>
					</div>
				</div>
			</header>

			<section className={`${styles.blueprintSurface} ${styles.hero}`}>
				<MeasureRail />
				<div className={styles.heroGrid}>
					<div className={styles.copyRail}>
						<h1>{landing("heroTitle")}</h1>
						<p className={styles.lead}>{landing("smallDescription")}</p>
						<p className={styles.bodyCopy}>{landing("heroDescription")}</p>
						<div className={styles.buttonRow}>
							<LandingButton href={CALENDLY_URL}>
								{landing("bookDemo")}
							</LandingButton>
							<LandingButton href={contactHref} secondary>
								{landing("contactUs")}
							</LandingButton>
						</div>
					</div>

					<div
						className={styles.heroEvidence}
						role="img"
						aria-label={landing("heroImageAlt")}
					>
						<div className={styles.heroLaptop}>
							<LaptopFrame
								src={HeroLaptopDashboard}
								alt={landing("heroImageAlt")}
								priority
							/>
						</div>
						<div className={styles.heroPhone}>
							<PhoneFrame alt={landing("whatsappLogoAlt")} priority />
						</div>
						<svg
							className={styles.heroLeaders}
							viewBox="0 0 1000 620"
							preserveAspectRatio="none"
							aria-hidden="true"
						>
							<path d="M208 420 L208 514 L340 514" />
							<path d="M520 345 L520 548 L606 548" />
							<path d="M782 308 L782 514 L894 514" />
							<circle cx="208" cy="420" r="5" />
							<circle cx="520" cy="345" r="5" />
							<circle cx="782" cy="308" r="5" />
						</svg>
						<div className={styles.heroAnnotations}>
							<div>
								<span>1</span>
								<strong>WhatsApp</strong>
								<small>{landing("section2Pill")}</small>
							</div>
							<div>
								<span>2</span>
								<strong>{howItems[1]?.title}</strong>
								<small>{howItems[1]?.desc}</small>
							</div>
							<div>
								<span>3</span>
								<strong>{text("why.heading")}</strong>
								<small>{text("why.description")}</small>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section id="proof" className={styles.clientStrip}>
				<div className={styles.clientIntro}>
					<strong>{landing("clientsHeading")}</strong>
					<span>{landing("clientsSubheading")}</span>
				</div>
				<div className={styles.clientLogos}>
					{clients.map((client) => (
						<Link
							key={client.name}
							href={client.href}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={client.name}
						>
							<Image
								src={client.logo}
								alt={client.name}
								className="max-h-10 w-auto object-contain"
							/>
						</Link>
					))}
				</div>
			</section>

			<section id="workflow" className={styles.workflowSection}>
				<MeasureRail />
				<div className={styles.sectionGrid}>
					<div className={styles.copyRail}>
						<h2>{landing("section2Title")}</h2>
						<p className={styles.lead}>{landing("section2Description")}</p>
						<p className={styles.bodyCopy}>{landing("section2Caption")}</p>
					</div>

					<div className={styles.workflowEvidence}>
						<div className={styles.workflowLaptop}>
							<LaptopFrame
								src={ScreenshotSiteDiary}
								alt={landing("section2ImageAlt")}
								objectClassName="object-cover object-top"
							/>
						</div>
						<div className={styles.workflowPhone}>
							<PhoneFrame alt={landing("whatsappLogoAlt")} />
						</div>

						<div className={styles.processLine} aria-hidden="true">
							<span />
							<span />
							<span />
						</div>

						<div className={styles.processSteps}>
							{[
								{ icon: Mic2, item: howItems[0] },
								{ icon: FileText, item: howItems[1] },
								{ icon: BarChart3, item: howItems[2] },
							].map(({ icon: Icon, item }, index) => (
								<div key={item?.title ?? index}>
									<span>{index + 1}</span>
									<Icon aria-hidden="true" />
									<strong>{item?.title}</strong>
									<small>{item?.desc}</small>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			<section id="budget" className={`${styles.blueprintSurface} ${styles.budgetSection}`}>
				<MeasureRail />
				<div className={styles.sectionGrid}>
					<div className={styles.copyRail}>
						<h2>
							{landing("budgetSection.titlePrefix")}{" "}
							<span>{landing("budgetSection.titleHighlight")}</span>
						</h2>
						<p className={styles.lead}>{landing("budgetSection.intro")}</p>
					</div>

					<div className={styles.budgetEvidence}>
						<div className={styles.budgetLaptop}>
							<LaptopFrame
								src={HeroLaptopDashboard}
								alt={landing("heroImageAlt")}
							/>
						</div>

						<svg
							className={styles.budgetLeaders}
							viewBox="0 0 1000 520"
							preserveAspectRatio="none"
							aria-hidden="true"
						>
							<path d="M245 238 L245 372 L155 372 L155 426" />
							<path d="M585 212 L585 398 L500 398 L500 426" />
							<path d="M815 258 L815 372 L845 372 L845 426" />
							<circle cx="245" cy="238" r="5" />
							<circle cx="585" cy="212" r="5" />
							<circle cx="815" cy="258" r="5" />
						</svg>

						<div className={styles.budgetFlows}>
							{budgetFlows.map((flow, index) => (
								<div key={flow.problem}>
									<span>{index + 1}</span>
									<strong>{flow.problem}</strong>
									<ArrowDownRight aria-hidden="true" />
									<p>{flow.solution}</p>
									<em>{flow.outcome}</em>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			<section className={styles.principlesSection}>
				<div className={styles.principlesIntro}>
					<h2>{text("why.heading")}</h2>
					<p>{text("why.description")}</p>
				</div>
				<div className={styles.principlesList}>
					{whyBullets.map((bullet, index) => (
						<div key={bullet}>
							<span>{String(index + 1).padStart(2, "0")}</span>
							<CheckCircle2 aria-hidden="true" />
							<p>{bullet}</p>
						</div>
					))}
				</div>
			</section>

			<section className={styles.demoSection}>
				<MeasureRail />
				<div className={styles.sectionGrid}>
					<div className={styles.copyRail}>
						<h2>{landing("videoTitle")}</h2>
						<p className={styles.lead}>{landing("videoCaption")}</p>
						<div className={styles.demoFacts}>
							<span><Mic2 aria-hidden="true" /> WhatsApp</span>
							<span><Camera aria-hidden="true" /> {landing("section2Pill")}</span>
							<span><BarChart3 aria-hidden="true" /> {text("why.heading")}</span>
						</div>
					</div>
					<div className={styles.videoFrame}>
						{videoPlaying ? (
							<iframe
								src={`${videoSrc}&autoplay=1`}
								title={landing("videoTitle")}
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								allowFullScreen
								referrerPolicy="strict-origin-when-cross-origin"
							/>
						) : (
							<button
								type="button"
								className={styles.videoPoster}
								onClick={() => setVideoPlaying(true)}
								aria-label={landing("videoTitle")}
							>
								<Image
									src={HeroLaptopDashboard}
									alt=""
									fill
									placeholder="blur"
									sizes="(min-width: 1024px) 60vw, 94vw"
									className="object-cover object-top"
								/>
								<span className={styles.playButton} aria-hidden="true">
									<Play />
								</span>
							</button>
						)}
					</div>
				</div>
			</section>

			<section className={styles.closingSection}>
				<div>
					<h2>{landing("heroDescription")}</h2>
					<p>{landing("smallDescription")}</p>
				</div>
				<div className={styles.closingActions}>
					<LandingButton href={CALENDLY_URL}>
						{landing("bookDemo")}
					</LandingButton>
					<Link href={contactHref} className={styles.closingSecondary}>
						{landing("contactUs")}
						<ArrowRight className="size-4" aria-hidden="true" />
					</Link>
				</div>
			</section>

			<footer className={styles.footer}>
				<Link href={`/${locale}/Landing_V3`} className={styles.wordmark}>
					Works<span>Recorded</span>
				</Link>
				<p>© {new Date().getFullYear()} WorksRecorded</p>
				<Link href={contactHref}>{landing("contactUs")}</Link>
			</footer>
		</main>
	);
}
