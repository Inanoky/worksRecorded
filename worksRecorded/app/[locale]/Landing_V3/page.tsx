import type { Metadata } from "next";
import LandingV3Page from "@/components/landing/LandingV3/LandingV3Page";

export const metadata: Metadata = {
	title: "WorksRecorded Landing V3",
	robots: {
		index: false,
		follow: false,
	},
};

export default function LandingV3Route() {
	return <LandingV3Page />;
}
