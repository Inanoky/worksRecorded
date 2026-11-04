"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLandingNavigation } from "@/components/landing/navigation/LandingNavigationContext";

type NewsPrefetcherProps = {
	locale: string;
	ids: number[];
};

export default function NewsPrefetcher({ locale, ids }: NewsPrefetcherProps) {
	const router = useRouter();
	const navigation = useLandingNavigation();

	useEffect(() => {
		for (const id of ids) {
			if (navigation) navigation.prefetch(`/${locale}/Landing/News/${id}`);
			else router.prefetch(`/${locale}/Landing/News/${id}`);
		}
	}, [router, locale, ids, navigation]);

	return null;
}
