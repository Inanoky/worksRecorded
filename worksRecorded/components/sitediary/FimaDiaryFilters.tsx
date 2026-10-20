"use client";

import {
	type FimaDiaryFilters as Filters,
	fimaDiaryFilterOptions,
} from "@/lib/fima/diary-filters";

export function FimaDiaryFilters({
	value,
	onChange,
}: {
	value: Filters;
	onChange: (value: Filters) => void;
}) {
	return (
		<div className="grid w-full grid-cols-2 gap-2 xl:flex xl:flex-wrap">
			{fimaDiaryFilterOptions.map((filter) => (
				<label
					key={filter.key}
					className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground xl:w-[190px]"
				>
					{filter.label}
					<select
						name={filter.key}
						value={value[filter.key] ?? ""}
						onChange={(event) =>
							onChange({
								...value,
								[filter.key]: event.target.value || undefined,
							})
						}
						className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<option value="">{filter.allLabel}</option>
						{filter.options.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>
			))}
		</div>
	);
}
