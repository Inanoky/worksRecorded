"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";

const VisualView = lazy(() => import("./VisualView"));

export function VisualTab({
	siteId,
	active,
}: {
	siteId: string;
	active: boolean;
}) {
	const [visited, setVisited] = useState(active);
	useEffect(() => {
		if (active) setVisited(true);
	}, [active]);
	return (
		<TabsContent
			value="visual"
			forceMount
			hidden={!active}
			className="data-[state=inactive]:hidden"
		>
			{visited || active ? (
				<Suspense fallback={<Skeleton className="h-64 w-full" />}>
					<VisualView key={siteId} siteId={siteId} active={active} />
				</Suspense>
			) : null}
		</TabsContent>
	);
}
