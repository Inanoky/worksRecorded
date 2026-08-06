//C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\app\layout.tsx
"use client";

import "@/app/globals.css";

import { useSelectedLayoutSegment } from "next/navigation";
import FooterDesktop from "@/components/landing/FooterDesktop";
import FooterMobile from "@/components/landing/FooterMobile";
import HeaderDesktop from "@/components/landing/HeaderDesktop";
import HeaderMobile from "@/components/landing/HeaderMobile";
import { useIsMobile } from "@/lib/utils/hooks/use-mobile";

export default function LandingLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const isMobile = useIsMobile();
	const childSegment = useSelectedLayoutSegment();

	if (childSegment === null) {
		return children;
	}

	return (
		<div className="overflow-x-hidden antialiased">
			{isMobile ? <HeaderMobile /> : <HeaderDesktop />}
			{children}
			{isMobile ? <FooterMobile /> : <FooterDesktop />}
		</div>
	);
}
