"use client";

import { Button } from "@/components/ui/button";

export function FimaOpenRecordButton({
	onOpen,
	disabled = false,
}: {
	onOpen: (trigger: HTMLButtonElement) => void;
	disabled?: boolean;
}) {
	return (
		<Button
			type="button"
			size="sm"
			variant="outline"
			className="h-7 px-2 text-xs"
			aria-label="Atvērt ierakstu"
			disabled={disabled}
			onClick={(event) => onOpen(event.currentTarget)}
		>
			Atvērt
		</Button>
	);
}
