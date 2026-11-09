"use client";

import { Button } from "@/components/ui/button";

export function DiaryDayPagination({
	page,
	totalPages,
	totalCount,
	totalRecords,
	first,
	last,
	remainingFirstPage,
	onExpandFirstPage,
	hasMoreUnknown = false,
	loadingMore = false,
	onLoadMore,
	onPageChange,
	language,
	disabled,
}: {
	page: number;
	totalPages: number;
	totalCount: number;
	totalRecords?: number;
	first: number;
	last: number;
	remainingFirstPage: number;
	onExpandFirstPage: () => void;
	hasMoreUnknown?: boolean;
	loadingMore?: boolean;
	onLoadMore?: () => void;
	onPageChange: (page: number) => void;
	language: string;
	disabled: boolean;
}) {
	const lv = language === "lv";
	const olderDisabled =
		disabled || loadingMore || (page >= totalPages && !hasMoreUnknown);
	const showOlder = () => {
		if (remainingFirstPage > 0) onExpandFirstPage();
		else if (page < totalPages) onPageChange(page + 1);
		else onLoadMore?.();
	};
	return (
		<nav
			aria-label={lv ? "Žurnāla lapas" : "Diary pages"}
			className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
		>
			<span className="text-xs text-muted-foreground">
				{lv
					? `Dienas ${first}–${last} no ${totalCount}${totalRecords === undefined ? "" : ` · ${totalRecords} ieraksti`}`
					: `Days ${first}–${last} of ${totalCount}${totalRecords === undefined ? "" : ` · ${totalRecords} records`}`}
			</span>
			<div className="flex items-center gap-2">
				{remainingFirstPage > 0 ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={disabled}
						aria-expanded="false"
						onClick={onExpandFirstPage}
					>
						{lv
							? `Rādīt vēl ${remainingFirstPage} dienas`
							: `Show ${remainingFirstPage} more days`}
					</Button>
				) : null}
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={disabled || page <= 1}
					onClick={() => onPageChange(page - 1)}
				>
					{lv ? "Iepriekšējā lapa" : "Previous page"}
				</Button>
				<span aria-live="polite">
					{page} / {totalPages}
				</span>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={olderDisabled}
					onClick={showOlder}
				>
					{loadingMore
						? lv
							? "Ielādē…"
							: "Loading…"
						: lv
							? "Nākamā lapa"
							: "Next page"}
				</Button>
			</div>
		</nav>
	);
}
