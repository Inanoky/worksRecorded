"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	type VisualEvidence,
	type VisualLayer,
	type VisualMark,
	visualLayers,
} from "./model";
import { formatVisualDay } from "./timeline";

const allLayers = Object.keys(visualLayers) as VisualLayer[];

export function VisualSidebar({
	id,
	open,
	marks,
	datedMarks,
	evidence,
	dayByEvidence,
	layers,
	onLayers,
	selected,
	onSelect,
	locked,
}: {
	id: string;
	open: boolean;
	marks: VisualMark[];
	datedMarks: VisualMark[];
	evidence: VisualEvidence[];
	dayByEvidence: Map<string, number | null>;
	layers: VisualLayer[];
	onLayers: (layers: VisualLayer[]) => void;
	selected: string | null;
	onSelect: (id: string) => void;
	locked: boolean;
}) {
	const [tab, setTab] = useState<"layers" | "sources">("layers");
	const [page, setPage] = useState(0);
	const [pageSize, setPageSize] = useState(4);
	const list = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		const element = list.current;
		if (!element || !open) return;
		const measure = () => {
			const height = element.getBoundingClientRect().height;
			if (height > 0)
				setPageSize(
					Math.max(1, Math.floor((height - 8) / (tab === "layers" ? 32 : 64))),
				);
		};
		measure();
		const observer =
			typeof ResizeObserver === "undefined"
				? null
				: new ResizeObserver(measure);
		observer?.observe(element);
		return () => observer?.disconnect();
	}, [open, tab]);
	const count = tab === "layers" ? allLayers.length : marks.length;
	const lastPage = Math.max(0, Math.ceil(count / pageSize) - 1);
	const currentPage = Math.min(page, lastPage);
	const start = currentPage * pageSize;
	return (
		<aside
			id={id}
			hidden={!open}
			aria-label="Darbu slāņi un avoti"
			className="absolute bottom-14 left-3 top-16 z-30 flex w-[220px] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border bg-background/95 shadow-lg backdrop-blur-sm"
		>
			<fieldset
				className="grid shrink-0 grid-cols-2 gap-1 border-b p-1"
				aria-label="Kartes panelis"
			>
				<Button
					size="sm"
					variant={tab === "layers" ? "secondary" : "ghost"}
					aria-pressed={tab === "layers"}
					onClick={() => {
						setTab("layers");
						setPage(0);
					}}
				>
					Darbu slāņi
				</Button>
				<Button
					size="sm"
					variant={tab === "sources" ? "secondary" : "ghost"}
					aria-pressed={tab === "sources"}
					onClick={() => {
						setTab("sources");
						setPage(0);
					}}
				>
					Zonu avoti
				</Button>
			</fieldset>
			{tab === "layers" ? (
				<label
					htmlFor={`${id}-all`}
					className="flex h-10 shrink-0 cursor-pointer items-center gap-2 border-b px-3 text-xs font-medium"
				>
					<Checkbox
						id={`${id}-all`}
						checked={
							layers.length === allLayers.length
								? true
								: layers.length
									? "indeterminate"
									: false
						}
						disabled={locked}
						onCheckedChange={() =>
							onLayers(layers.length === allLayers.length ? [] : allLayers)
						}
					/>
					{layers.length === allLayers.length ? "Paslēpt visus" : "Rādīt visus"}
				</label>
			) : null}
			<div
				ref={list}
				className="min-h-0 flex-1 overflow-hidden p-1"
				data-testid="visual-sidebar-list"
			>
				{tab === "layers" ? (
					<fieldset aria-label="Darbu slāņi">
						{allLayers.slice(start, start + pageSize).map((key) => (
							<label
								key={key}
								htmlFor={`${id}-${key}`}
								className="flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-xs hover:bg-muted"
							>
								<Checkbox
									id={`${id}-${key}`}
									checked={layers.includes(key)}
									disabled={locked}
									onCheckedChange={(checked) =>
										onLayers(
											checked
												? [...layers, key]
												: layers.filter((item) => item !== key),
										)
									}
								/>
								<span
									aria-hidden="true"
									className="h-3 w-3 shrink-0 rounded-sm"
									style={{ backgroundColor: visualLayers[key].color }}
								/>
								<span className="truncate">
									{visualLayers[key].label} (
									{datedMarks.filter((mark) => mark.layer === key).length})
								</span>
							</label>
						))}
					</fieldset>
				) : (
					marks.slice(start, start + pageSize).map((mark, i) => {
						const source = evidence.find((item) => item.id === mark.evidenceId);
						const day = dayByEvidence.get(mark.evidenceId);
						const work = source?.work || visualLayers[mark.layer].label;
						return (
							<Button
								key={mark.id}
								disabled={locked}
								variant={selected === mark.id ? "secondary" : "ghost"}
								className="h-16 w-full justify-start whitespace-normal px-2 text-left"
								title={work}
								onClick={() => onSelect(mark.id)}
							>
								<span className="min-w-0">
									<span className="block text-xs text-muted-foreground">
										{day != null ? formatVisualDay(day) : "Bez datuma"} · lapa{" "}
										{mark.page}
									</span>
									<span className="line-clamp-2 text-xs">
										{start + i + 1}. {work}
										{source?.reviewRequired ? " · Jāpārskata" : ""}
									</span>
								</span>
							</Button>
						);
					})
				)}
				{!count ? (
					<p className="p-2 text-xs text-muted-foreground">Nav redzamu zonu.</p>
				) : null}
			</div>
			<div className="flex h-9 shrink-0 items-center justify-between border-t px-1">
				<Button
					size="icon"
					variant="ghost"
					className="h-7 w-7"
					aria-label="Iepriekšējā avotu lapa"
					disabled={currentPage === 0}
					onClick={() => setPage(currentPage - 1)}
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<span className="text-xs tabular-nums text-muted-foreground">
					{count
						? `${start + 1}–${Math.min(count, start + pageSize)} no ${count}`
						: "0"}
				</span>
				<Button
					size="icon"
					variant="ghost"
					className="h-7 w-7"
					aria-label="Nākamā avotu lapa"
					disabled={currentPage >= lastPage}
					onClick={() => setPage(currentPage + 1)}
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</aside>
	);
}
