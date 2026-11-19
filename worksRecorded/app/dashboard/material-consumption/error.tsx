"use client";

import { Button } from "@/components/ui/button";

export default function MaterialConsumptionError({
	reset,
}: {
	reset: () => void;
}) {
	return (
		<section className="mx-auto max-w-2xl space-y-4 p-6" role="alert">
			<h1 className="text-2xl font-semibold">
				Neizdevās ielādēt materiālu patēriņu
			</h1>
			<p className="text-sm text-muted-foreground">
				Pārbaudiet savienojumu un izvēlēto organizāciju, tad mēģiniet vēlreiz.
			</p>
			<Button onClick={reset}>Mēģināt vēlreiz</Button>
		</section>
	);
}
