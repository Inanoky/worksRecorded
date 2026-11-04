import { NextResponse } from "next/server";
import { isLandingLocale } from "@/components/landing/navigation/landing-routes";
import { getLandingNavigationMetadata } from "@/server/landing/navigation-metadata";

export async function GET(request: Request) {
	const locale = new URL(request.url).searchParams.get("locale") || "lv";
	if (!isLandingLocale(locale))
		return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
	const [messages, metadata] = await Promise.all([
		import(`@/messages/${locale}.json`).then((module) => module.default),
		getLandingNavigationMetadata(locale),
	]);
	return NextResponse.json(
		{ messages, metadata },
		{
			headers: {
				"Cache-Control":
					"public, max-age=300, s-maxage=300, stale-while-revalidate=600",
			},
		},
	);
}
