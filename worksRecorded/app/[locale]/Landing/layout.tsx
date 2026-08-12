//C:\Users\user\MainProjects\Buvconsult-deploy\buvconsult\app\layout.tsx
import "@/app/globals.css";

import FooterDesktop from "@/components/landing/FooterDesktop";
import FooterMobile from "@/components/landing/FooterMobile";
import HeaderDesktop from "@/components/landing/HeaderDesktop";
import HeaderMobile from "@/components/landing/HeaderMobile";

export default function LandingLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="landing-tactile overflow-x-hidden antialiased">
			<div className="md:hidden">
				<HeaderMobile />
			</div>
			<div className="hidden md:block">
				<HeaderDesktop />
			</div>
			{children}
			<div className="md:hidden">
				<FooterMobile />
			</div>
			<div className="hidden md:block">
				<FooterDesktop />
			</div>
		</div>
	);
}
