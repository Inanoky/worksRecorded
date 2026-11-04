import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildLandingMetadata } from "@/lib/seo/landingMetadata";
import ClientPage from "./ClientPage";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { locale } = await params;
	return buildLandingMetadata({
		locale,
		path: "/Landing/BIS-integracija",
		title: "BIS integrācija un automatizācija | WorksRecorded",
		description:
			"BIS automatizācija no WhatsApp: materiālu, būvizstrādājumu un ikdienas darbu aizpildīšana ar WorksRecorded.",
		keywords: [
			"BIS integrācija",
			"BIS automatizācija",
			"WhatsApp BIS",
			"WorksRecorded",
			"AI būvniecībā",
		],
	});
}

export default async function Page({ params }: PageProps) {
	const { locale } = await params;
	if (locale !== "lv") notFound();
	return <ClientPage />;
}
