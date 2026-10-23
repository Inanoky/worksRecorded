"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { formatFimaDiaryNumber } from "@/lib/fima/diary-number";

export function FimaNumberCell({ value }: { value: unknown }) {
	const number = formatFimaDiaryNumber(value);
	return (
		<span className="group inline-flex max-w-full flex-wrap items-center gap-0.5">
			<span className="max-w-full cursor-text select-text whitespace-normal tabular-nums [overflow-wrap:anywhere]">
				{number}
			</span>
			{number !== "—" ? (
				<button
					type="button"
					aria-label={`Kopēt ${number}`}
					title="Kopēt FIMA numuru"
					className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={async () => {
						try {
							await navigator.clipboard.writeText(number);
							toast.success("Nokopēts");
						} catch {
							toast.error(
								"Neizdevās nokopēt numuru. Atlasiet tekstu un izmantojiet Ctrl+C.",
							);
						}
					}}
				>
					<Copy className="size-3" aria-hidden="true" />
				</button>
			) : null}
		</span>
	);
}
