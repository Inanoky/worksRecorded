"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fimaReviewFilterOptions } from "@/lib/fima/diary-filters";

export function FimaReviewFilter({
	value,
	onChange,
}: {
	value?: string;
	onChange: (value: string | undefined) => void;
}) {
	const selected = new Set(value?.split(","));
	const options = fimaReviewFilterOptions.filter(({ value }) =>
		selected.has(value),
	);
	const summary =
		options.length > 1
			? `Atlasītas ${options.length} rīcības`
			: (options[0]?.label ?? "Visas rīcības");

	return (
		<div className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground xl:w-[190px]">
			<span>Rīcība</span>
			<DropdownMenu modal={false}>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="outline"
						aria-label="Rīcība"
						title={options.map(({ label }) => label).join(", ") || summary}
						className="w-full justify-between px-2 font-normal text-foreground"
					>
						<span className="truncate">{summary}</span>
						<ChevronDown className="size-4 shrink-0" aria-hidden="true" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" aria-label="Atlasīt rīcības">
					{fimaReviewFilterOptions.map(({ value, label }) => (
						<DropdownMenuCheckboxItem
							key={value}
							checked={selected.has(value)}
							onSelect={(event) => event.preventDefault()}
							onCheckedChange={(checked) => {
								if (checked) selected.add(value);
								else selected.delete(value);
								const next = fimaReviewFilterOptions
									.filter((option) => selected.has(option.value))
									.map((option) => option.value)
									.join(",");
								onChange(next || undefined);
							}}
						>
							{label}
						</DropdownMenuCheckboxItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						disabled={!options.length}
						onSelect={() => onChange(undefined)}
					>
						Visas rīcības
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
