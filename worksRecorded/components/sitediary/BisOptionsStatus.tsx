"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BisOptionsStatus({
	resource,
}: {
	resource: { loading: boolean; error?: string; refresh: () => Promise<void> };
}) {
	if (resource.loading)
		return (
			<output className="flex items-center gap-2 text-xs text-muted-foreground">
				<Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
				Ielādē BIS sarakstu…
			</output>
		);
	if (resource.error)
		return (
			<div className="space-y-1">
				<p role="alert" className="text-xs text-destructive">
					{resource.error}
				</p>
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => void resource.refresh()}
				>
					Mēģināt vēlreiz
				</Button>
			</div>
		);
	return null;
}
