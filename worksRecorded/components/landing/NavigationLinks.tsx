import { LANDING_SECTIONS } from "./agents/catalog";

export const MAIN_LINKS = [
	{ href: "/Landing/Services", labelKey: "services" },
	{ href: `/Landing#${LANDING_SECTIONS.workflow}`, labelKey: "howItWorks" },
	{ href: "/Landing/Pricing", labelKey: "pricing" },
	{ href: "/Landing/CaseStudies", labelKey: "caseStudies" },
] as const;

export const COMPANY_LINKS = [
	{ href: "/Landing/About", labelKey: "about" },
	{ href: "/Landing/Manufacturing", labelKey: "manufacturing" },
	{ href: "/Landing/Custom", labelKey: "custom" },
	{ href: "/Landing/News", labelKey: "news" },
	{ href: "/Landing/ContactForm", labelKey: "contacts" },
] as const;
