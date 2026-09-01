import { Loader2 } from "lucide-react";

export function ProjectOpeningOverlay({ label }: { label: string }) {
	return (
		<output
			className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm"
			aria-live="polite"
			aria-label={label}
		>
			<div className="flex min-w-64 flex-col items-center gap-4 rounded-xl border bg-card p-8 text-card-foreground shadow-xl">
				<Loader2
					className="size-10 animate-spin text-primary"
					aria-hidden="true"
				/>
				<p className="text-base font-medium">{label}</p>
			</div>
		</output>
	);
}
