import "@/app/globals.css";
import LandingClientShell from "@/components/landing/navigation/LandingClientShell";
import { getLandingNavigationMetadata } from "@/server/landing/navigation-metadata";

export default async function LandingLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}>) {
	const { locale } = await params;
	const metadata = await getLandingNavigationMetadata(locale);
	return (
		<LandingClientShell metadata={metadata}>{children}</LandingClientShell>
	);
}
