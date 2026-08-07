import type { Metadata } from "next";
import ModernLandingPage from "@/components/landing/Landing/ModernLandingPage";

export const metadata: Metadata = {
	robots: {
		index: false,
		follow: false,
	},
};

export default function LandingV2Page() {
	return <ModernLandingPage homePath="Landing_v2" />;
}
