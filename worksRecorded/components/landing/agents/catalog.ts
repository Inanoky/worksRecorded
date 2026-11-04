import {
	ChartNoAxesCombined,
	ClipboardClock,
	FileCheck2,
	FileSpreadsheet,
	Gauge,
	HardHat,
	Landmark,
	MessageCircleMore,
	PackageCheck,
	Wrench,
} from "lucide-react";

export const AGENT_MONTHLY_PRICE = 150;

export const AGENTS = [
	{ id: "workRecords", icon: HardHat, detailPath: "/Landing/SiteDiary" },
	{
		id: "financialAnalytics",
		icon: ChartNoAxesCombined,
		detailPath: "/Landing/Analytics",
	},
	{ id: "whatsapp", icon: MessageCircleMore, detailPath: null },
	{ id: "financialControl", icon: Gauge, detailPath: null },
	{ id: "estimation", icon: FileSpreadsheet, detailPath: null },
	{ id: "materials", icon: PackageCheck, detailPath: null },
	{ id: "timesheets", icon: ClipboardClock, detailPath: "/Landing/Timesheets" },
	{ id: "tools", icon: Wrench, detailPath: null },
] as const;

export const SERVICES = [
	{ id: "bis", icon: FileCheck2 },
	{ id: "accounting", icon: Landmark },
] as const;

export const DEMO_URL = "https://calendly.com/vjaceslavs-worksrecorded/30min";

export const LANDING_SECTIONS = {
	agents: "agents",
	workflow: "how-it-works",
	team: "team",
} as const;
