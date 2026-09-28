"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { BeginDay } from "@/lib/begin-hours";
import {
	formatBeginExplanationNumber,
	presentBeginExplanation,
} from "@/lib/begin-hours-explanation";
import { getBeginWorkerComments } from "@/lib/begin-worker-comments";

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
	const explanation = presentBeginExplanation(allocation.explanation);
	const personHours =
		allocation.hours !== null && allocation.workers !== null
			? allocation.hours * allocation.workers
			: null;
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
				className="max-h-[min(75vh,var(--radix-popover-content-available-height))] w-[min(92vw,480px)] space-y-4 overflow-y-auto text-sm leading-relaxed"
				onOpenAutoFocus={(event) => event.preventDefault()}
				onCloseAutoFocus={(event) => event.preventDefault()}
				onPointerEnter={(event) => {
					if (event.pointerType !== "touch") show();
				}}
				onPointerLeave={(event) => {
					if (event.pointerType !== "touch") leave();
				}}
			>
				<div className="flex items-baseline justify-between gap-3">
					<p className="font-semibold">Stundu aprēķins</p>
					<time className="text-xs text-muted-foreground" dateTime={day?.date}>
						{day?.date.split("-").reverse().join(".")}
					</time>
				</div>
				{stale ? (
					<output className="mb-3 block rounded-md border bg-muted p-2">
						Stundas, darbinieku skaits vai Begin imports ir mainījies. Šis
						skaidrojums attiecas uz iepriekš saglabāto sadalījumu; pārbaudiet
						to.
					</output>
				) : null}
				{stale ? (
					<p className="text-xs text-muted-foreground">
						Iepriekš saglabātais sadalījums
					</p>
				) : null}
				<dl className="grid grid-cols-3 gap-3 rounded-md bg-muted/50 p-3">
					{(
						[
							["Stundas", allocation.hours],
							["Darbinieki", allocation.workers],
							["Cilvēkstundas", personHours],
						] as const
					).map(([label, amount]) => (
						<div key={String(label)}>
							<dt className="text-xs text-muted-foreground">{label}</dt>
							<dd className="mt-1 text-lg font-semibold tabular-nums">
								{formatBeginExplanationNumber(amount)}
							</dd>
						</div>
					))}
				</dl>
				{explanation.team ? (
					<section className="space-y-2">
						<h4 className="text-xs font-medium text-muted-foreground">
							{explanation.team}
						</h4>
						<dl className="divide-y">
							{explanation.workers.map((worker) => {
								const comments = getBeginWorkerComments(
									day,
									allocation.sourceImportedAt,
									worker.name,
								);
								return (
									<div
										key={worker.name}
										className="grid grid-cols-[minmax(0,1fr)_max-content_minmax(0,1.5fr)] items-start gap-3 py-1.5"
									>
										<dt className="[overflow-wrap:anywhere]">{worker.name}</dt>
										<dd className="whitespace-nowrap tabular-nums">
											{worker.duration}
										</dd>
										<dd className="whitespace-pre-wrap [overflow-wrap:anywhere] [&>p+p]:mt-1">
											<span className="sr-only">Begin komentārs: </span>
											{comments.length ? (
												comments.map((comment) => (
													<p key={comment}>{comment}</p>
												))
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</dd>
									</div>
								);
							})}
						</dl>
					</section>
				) : null}
				{explanation.calculations.length ? (
					<details className="space-y-1.5 border-l-2 pl-3">
						<summary className="cursor-pointer text-xs font-medium text-muted-foreground">
							Aprēķina soļi
						</summary>
						{explanation.calculations.map((line) => (
							<p key={line} className="tabular-nums [overflow-wrap:anywhere]">
								{line}
							</p>
						))}
					</details>
				) : null}
				{explanation.notes.length ? (
					<section className="space-y-2">
						<h4 className="text-xs font-medium text-muted-foreground">
							Piezīmes par sadalījumu
						</h4>
						{explanation.notes.map((line) => (
							<p key={line} className="[overflow-wrap:anywhere]">
								{line}
							</p>
						))}
					</section>
				) : null}
				<details className="border-t pt-3">
					<summary className="cursor-pointer text-xs text-muted-foreground">
						Pilns skaidrojums
					</summary>
					<p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
						{allocation.explanation}
					</p>
				</details>
			</PopoverContent>
		</Popover>
	);
}
