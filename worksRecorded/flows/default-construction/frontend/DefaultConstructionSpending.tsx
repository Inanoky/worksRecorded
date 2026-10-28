"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { projectSpendingInput } from "../lib/spending-project";
import { DefaultConstructionSpendingPreview } from "./DefaultConstructionSpendingPreview";
import { useLimeniProjectData } from "./LimeniProjectData";

export function DefaultConstructionSpending() {
	const { snapshot, failed, denied } = useLimeniProjectData();
	const data = useMemo(
		() =>
			snapshot?.forma2.data.clientCosts
				? projectSpendingInput({
						data: snapshot.forma2.data,
						config: snapshot.config,
						rows: snapshot.diary.rows,
					})
				: null,
		[snapshot],
	);
	if (denied)
		return <p role="alert">Projekta dati nav pieejami šim lietotājam.</p>;
	if (!data)
		return failed ? (
			<p role="alert">
				Neizdevās ielādēt projekta finanšu datus. Atveriet projektu vēlreiz.
			</p>
		) : (
			<Skeleton
				className="m-6 h-80"
				aria-label="Ielādē projekta finanšu datus"
			/>
		);
	return (
		<>
			{failed ? (
				<output className="mx-6 mt-4 block rounded-lg border p-3 text-sm">
					Fona atjaunošana neizdevās. Redzami pēdējie saglabātie projekta dati.
				</output>
			) : null}
			<DefaultConstructionSpendingPreview {...data} />
		</>
	);
}
