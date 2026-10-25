"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/utils";

type Props = {
	page: number;
	totalPages: number;
	summary: ReactNode;
	onPageChange: (page: number) => void;
	disabled?: boolean;
	language?: "lv" | "en";
	previous?: string;
	next?: string;
	label?: string;
};

function pageItems(page: number, totalPages: number) {
	const visible = new Set([1, totalPages]);
	for (
		let number = Math.max(1, page - 2);
		number <= Math.min(totalPages, page + 2);
		number++
	) {
		visible.add(number);
	}
	const pages = [...visible].sort((left, right) => left - right);
	const items: { page?: number; key: string }[] = [];
	for (const number of pages) {
		const previous = items.at(-1)?.page;
		if (previous && number - previous === 2) {
			items.push({ page: previous + 1, key: String(previous + 1) });
		} else if (previous && number - previous > 2) {
			items.push({ key: `gap-${number}` });
		}
		items.push({ page: number, key: String(number) });
	}
	return items;
}

export function FimaPagination({
	page,
	totalPages,
	summary,
	onPageChange,
	disabled = false,
	language = "lv",
	previous = language === "lv" ? "Iepriekšējā" : "Previous",
	next = language === "lv" ? "Nākamā" : "Next",
	label = language === "lv" ? "Ierakstu lapas" : "Record pages",
}: Props) {
	const inputId = useId();
	const rangeId = useId();
	const [draft, setDraft] = useState(String(page));
	useEffect(
		() => setDraft(String(Math.max(1, Math.min(page, totalPages)))),
		[page, totalPages],
	);
	const number = Number(draft);
	const valid =
		draft.trim() !== "" &&
		Number.isSafeInteger(number) &&
		number >= 1 &&
		number <= totalPages;
	const changePage = (target: number) => {
		if (!disabled && target !== page && target >= 1 && target <= totalPages)
			onPageChange(target);
	};
	return (
		<nav
			aria-label={label}
			className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-3"
		>
			<span className="text-sm text-muted-foreground">{summary}</span>
			<div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
				<div className="flex flex-wrap items-center gap-1">
					<Button
						type="button"
						variant="outline"
						size="sm"
						aria-label={previous}
						disabled={disabled || page <= 1}
						onClick={() => changePage(page - 1)}
					>
						<ChevronLeft className="size-4" />
						<span className="hidden sm:inline">{previous}</span>
					</Button>
					{pageItems(page, totalPages).map((item) =>
						item.page ? (
							<Button
								key={item.key}
								type="button"
								variant={item.page === page ? "outline" : "ghost"}
								size="sm"
								aria-label={
									language === "lv" ? `Lapa ${item.page}` : `Page ${item.page}`
								}
								aria-current={item.page === page ? "page" : undefined}
								disabled={disabled}
								className={cn(
									"h-8 min-w-8 px-2 tabular-nums",
									item.page === page && "bg-accent font-semibold",
								)}
								onClick={() => {
									if (item.page) changePage(item.page);
								}}
							>
								{item.page}
							</Button>
						) : (
							<span
								key={item.key}
								aria-hidden="true"
								className="px-1 text-muted-foreground"
							>
								…
							</span>
						),
					)}
					<Button
						type="button"
						variant="outline"
						size="sm"
						aria-label={next}
						disabled={disabled || page >= totalPages}
						onClick={() => changePage(page + 1)}
					>
						<span className="hidden sm:inline">{next}</span>
						<ChevronRight className="size-4" />
					</Button>
				</div>
				<form
					className="flex items-center gap-2 text-sm"
					onSubmit={(event) => {
						event.preventDefault();
						if (valid) changePage(number);
					}}
				>
					<label htmlFor={inputId} className="whitespace-nowrap">
						{language === "lv" ? "Uz lapu" : "Go to page"}
					</label>
					<Input
						id={inputId}
						type="number"
						inputMode="numeric"
						min={1}
						max={totalPages}
						step={1}
						value={draft}
						disabled={disabled}
						aria-describedby={rangeId}
						aria-invalid={draft !== "" && !valid}
						className="h-8 w-20 tabular-nums"
						onChange={(event) => setDraft(event.target.value)}
					/>
					<span
						id={rangeId}
						className="whitespace-nowrap tabular-nums text-muted-foreground"
					>
						{page} / {totalPages}
					</span>
					<Button
						type="submit"
						variant="outline"
						size="sm"
						disabled={disabled || !valid || number === page}
					>
						{language === "lv" ? "Iet" : "Go"}
					</Button>
				</form>
			</div>
		</nav>
	);
}
