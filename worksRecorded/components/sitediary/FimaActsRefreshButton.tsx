"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshFimaAcceptanceActs } from "@/server/actions/fima-acceptance-acts";

export function FimaActsRefreshButton({
	siteId,
	onRefreshed,
}: {
	siteId?: string | null;
	onRefreshed: () => unknown;
}) {
	const [loading, setLoading] = useState(false);
	if (!siteId) return null;
	const refresh = async () => {
		setLoading(true);
		try {
			const result = await refreshFimaAcceptanceActs(siteId);
			await onRefreshed();
			toast.success(`Aktu saites atjaunotas (${result.actCount} akti).`);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Neizdevās atjaunot aktu saites.",
			);
		} finally {
			setLoading(false);
		}
	};
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			disabled={loading}
			onClick={() => void refresh()}
		>
			{loading ? "Pārbauda aktus..." : "Atjaunot aktus"}
		</Button>
	);
}
