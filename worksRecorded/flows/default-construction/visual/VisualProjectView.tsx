"use client";

import { usePathname } from "next/navigation";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const VisualView = lazy(() => import("./VisualView"));

export function VisualProjectView({
	siteId,
	children,
}: {
	siteId: string;
	children: ReactNode;
}) {
	const active =
		usePathname() === "/dashboard/sites/" + siteId + "/izpildshemas";
	const [visited, setVisited] = useState(active);
	useEffect(() => {
		if (active) setVisited(true);
	}, [active]);
	return (
		<>
			{children}
			<section hidden={!active} aria-label="Izpildshēmas">
				{visited || active ? (
					<Suspense fallback={<Skeleton className="h-64 w-full" />}>
						<VisualView siteId={siteId} />
					</Suspense>
				) : null}
			</section>
		</>
	);
}
