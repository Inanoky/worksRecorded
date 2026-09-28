"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { BeginDay } from "@/lib/begin-hours";

export function BeginRecordHours({
	day,
	recordId,
	value,
	hours,
	workers,
}: {
	day?: BeginDay;
	recordId?: string | null;
	value: ReactNode;
	hours?: number | string | null;
	workers?: number | string | null;
}) {
	const [open, setOpen] = useState(false);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (closeTimer.current) clearTimeout(closeTimer.current);
		},
		[],
	);
	const allocation = day?.allocations?.find(
		(item) => item.recordId === recordId,
	);
	if (!allocation) return <>{value}</>;
	const matches = (current: unknown, saved: number | null) => {
		if (current == null || current === "") return saved === null;
		return (
			saved !== null &&
			Math.abs(Number(String(current).replace(",", ".")) - saved) < 0.000001
		);
	};
	const stale =
		allocation.sourceImportedAt !== day?.importedAt ||
		!matches(hours, allocation.hours) ||
		!matches(workers, allocation.workers);
	const show = () => {
		if (closeTimer.current) clearTimeout(closeTimer.current);
		setOpen(true);
	};
	const leave = () => {
		if (closeTimer.current) clearTimeout(closeTimer.current);
		closeTimer.current = setTimeout(() => setOpen(false), 180);
	};
	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				if (closeTimer.current) clearTimeout(closeTimer.current);
				setOpen(next);
			}}
		>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="cursor-help whitespace-nowrap tabular-nums underline decoration-dotted underline-offset-4"
					aria-label={`Stundu aprēķina skaidrojums: ${typeof value === "string" ? value : "stundas"}`}
					onPointerEnter={(event) => {
						if (event.pointerType !== "touch") show();
					}}
					onPointerLeave={(event) => {
						if (event.pointerType !== "touch") leave();
					}}
					onFocus={(event) => {
						if (event.currentTarget.matches(":focus-visible")) show();
					}}
				>
					{value}
				</button>
			</PopoverTrigger>
			<PopoverContent
				side="top"
				align="center"
				aria-label="Stundu aprēķina skaidrojums"
				className="max-h-[65vh] w-[min(90vw,480px)] overflow-y-auto text-sm"
				onOpenAutoFocus={(event) => event.preventDefault()}
				onCloseAutoFocus={(event) => event.preventDefault()}
				onPointerEnter={(event) => {
					if (event.pointerType !== "touch") show();
				}}
				onPointerLeave={(event) => {
					if (event.pointerType !== "touch") leave();
				}}
			>
				<p className="mb-2 font-medium">Stundu aprēķins · {day?.date}</p>
				{stale ? (
					<output className="mb-3 block rounded-md border bg-muted p-2">
						Stundas, darbinieku skaits vai Begin imports ir mainījies. Šis
						skaidrojums attiecas uz iepriekš saglabāto sadalījumu; pārbaudiet
						to.
					</output>
				) : null}
				<p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
					{allocation.explanation}
				</p>
			</PopoverContent>
		</Popover>
	);
}
