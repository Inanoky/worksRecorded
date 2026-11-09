"use client";

import { usePathname } from "next/navigation";
import { Activity, type ReactNode, useEffect, useState } from "react";
import { OzoluClient } from "./OzoluClient";

export function OzoluHost({ children }: { children: ReactNode }) {
	const active = usePathname() === "/demo";
	const [visited, setVisited] = useState(active);
	useEffect(() => {
		if (active) setVisited(true);
	}, [active]);
	return (
		<>
			<Activity mode={active ? "hidden" : "visible"}>{children}</Activity>
			{visited || active ? (
				<Activity mode={active ? "visible" : "hidden"}>
					<OzoluClient />
				</Activity>
			) : null}
		</>
	);
}
