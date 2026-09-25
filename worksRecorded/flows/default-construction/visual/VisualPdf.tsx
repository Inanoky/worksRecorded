"use client";

import {
	ChevronLeft,
	ChevronRight,
	Expand,
	Minus,
	Pencil,
	Plus,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type VisualEvidence, type VisualMark, visualLayers } from "./model";
import { type PolygonEdit, polygonEditSchema } from "./polygon-edit";
import { useDrawingViewport } from "./useDrawingViewport";
import { VisualZoneTarget } from "./VisualZoneTarget";
import { MAX_DRAWING_ZOOM, MIN_DRAWING_ZOOM } from "./viewport";

export function VisualPdf({
	url,
	marks,
	selected,
	onSelect,
	evidence = [],
	editable = false,
	onSave,
	onEditingChange,
}: {
	url: string;
	marks: VisualMark[];
	selected: string | null;
	onSelect: (id: string) => void;
	evidence?: VisualEvidence[];
	editable?: boolean;
	onSave?: (edit: PolygonEdit) => Promise<void>;
	onEditingChange?: (editing: boolean) => void;
}) {
	const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
	const [page, setPage] = useState(1);
	const [aspect, setAspect] = useState(1);
	const [error, setError] = useState(false);
	const [ready, setReady] = useState(false);
	const [highlighted, setHighlighted] = useState<string | null>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const [draft, setDraft] = useState<PolygonEdit | null>(null);
	const [cornerIds, setCornerIds] = useState<string[]>([]);
	const nextCornerId = useRef(0);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const drag = useRef<number | null>(null);
	const navigation = useDrawingViewport(
		aspect,
		`${url}:${page}`,
		ready && !draft,
	);
	const { surface } = navigation;
	const interactionLocked = !!draft || navigation.panning;
	useEffect(() => {
		setHighlighted((current) =>
			interactionLocked ||
			!marks.some((mark) => mark.id === current && mark.page === page)
				? null
				: current,
		);
	}, [page, interactionLocked, marks]);
	const selectedMark = marks.find((mark) => mark.id === selected);
	const shownMarks = marks.map((mark) =>
		draft?.markId === mark.id ? { ...mark, polygon: draft.polygon } : mark,
	);
	const validDraft = draft ? polygonEditSchema.safeParse(draft).success : true;
	function endEditing() {
		setDraft(null);
		setSaveError(null);
		onEditingChange?.(false);
	}
	function moveCorner(index: number, x: number, y: number) {
		setDraft((value) =>
			value
				? {
						...value,
						polygon: value.polygon.map((point, i) =>
							i === index
								? {
										x: Math.max(0, Math.min(1, x)),
										y: Math.max(0, Math.min(1, y)),
									}
								: point,
						),
					}
				: value,
		);
	}
	async function save() {
		if (!draft || !onSave || !validDraft || saving) return;
		setSaving(true);
		setSaveError(null);
		try {
			await onSave(draft);
			endEditing();
		} catch {
			setSaveError(
				"Neizdevās saglabāt zonu. Tā var būt mainīta citā logā; atceliet un pārlādējiet rasējumu.",
			);
		} finally {
			setSaving(false);
		}
	}
	const selectedPage = marks.find((mark) => mark.id === selected)?.page;
	useEffect(() => {
		if (selectedPage) setPage(selectedPage);
	}, [selectedPage]);
	useEffect(() => {
		let active = true;
		let task:
			| ReturnType<typeof import("pdfjs-dist")["getDocument"]>
			| undefined;
		const abort = new AbortController();
		setDocument(null);
		setHighlighted(null);
		setError(false);
		setReady(false);
		setPage(1);
		void (async () => {
			try {
				const [response, pdfjs, worker] = await Promise.all([
					fetch(url, { signal: abort.signal }),
					import("pdfjs-dist"),
					import("./pdf-worker-url"),
				]);
				if (!response.ok) throw new Error("PDF unavailable");
				const bytes = new Uint8Array(await response.arrayBuffer());
				if (!active) return;
				pdfjs.GlobalWorkerOptions.workerSrc = worker.pdfWorkerUrl;
				task = pdfjs.getDocument({ data: bytes });
				const pdf = await task.promise;
				if (active) setDocument(pdf);
			} catch {
				if (active) setError(true);
			}
		})();
		return () => {
			active = false;
			abort.abort();
			void task?.destroy();
		};
	}, [url]);
	useEffect(() => {
		if (!document) return;
		let active = true;
		let render: { promise: Promise<void>; cancel: () => void } | undefined;
		setReady(false);
		setError(false);
		void (async () => {
			try {
				const pdfPage = await document.getPage(page);
				if (!active || !canvas.current) return;
				const base = pdfPage.getViewport({ scale: 1 });
				setAspect(base.width / base.height);
				const viewport = pdfPage.getViewport({ scale: 1800 / base.width });
				const element = canvas.current;
				const context = element.getContext("2d");
				if (!context) throw new Error("Canvas unavailable");
				element.width = viewport.width;
				element.height = viewport.height;
				render = pdfPage.render({
					canvas: element,
					canvasContext: context,
					viewport,
				});
				await render.promise;
				if (active) setReady(true);
			} catch {
				if (active) setError(true);
			}
		})();
		return () => {
			active = false;
			render?.cancel();
		};
	}, [document, page]);
	return (
		<div className="relative min-w-0 overflow-hidden rounded-xl border bg-muted/40">
			<div
				data-drawing-control
				className="absolute left-3 top-3 z-30 flex max-w-[calc(100%-5rem)] flex-wrap items-center gap-1 rounded-lg border bg-background p-1 shadow-sm"
			>
				<Button
					variant="outline"
					size="icon"
					className="h-8 w-8 border-0 shadow-none"
					aria-label="Iepriekšējā lapa"
					disabled={!!draft || page <= 1}
					onClick={() => setPage((value) => value - 1)}
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<span className="px-2 text-xs tabular-nums">
					Lapa {page} / {document?.numPages ?? "—"}
				</span>
				<Button
					variant="outline"
					size="icon"
					className="h-8 w-8 border-0 shadow-none"
					aria-label="Nākamā lapa"
					disabled={!!draft || !document || page >= document.numPages}
					onClick={() => setPage((value) => value + 1)}
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
				{onSave && !draft ? (
					<Button
						size="sm"
						variant="outline"
						disabled={!editable || !selectedMark || !ready}
						onClick={() => {
							if (!selectedMark) return;
							navigation.freeze();
							setCornerIds(
								selectedMark.polygon.map(
									() => `corner-${nextCornerId.current++}`,
								),
							);
							setDraft({
								markId: selectedMark.id,
								expectedPolygon: selectedMark.polygon,
								polygon: selectedMark.polygon.map((point) => ({ ...point })),
							});
							onEditingChange?.(true);
						}}
					>
						<Pencil className="mr-1 h-3.5 w-3.5" />
						Pielāgot zonu
					</Button>
				) : null}
				{draft ? (
					<>
						<Button
							size="sm"
							disabled={saving || !validDraft}
							onClick={() => void save()}
						>
							{saving ? "Saglabā…" : "Saglabāt zonu"}
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={saving}
							onClick={endEditing}
						>
							Atcelt
						</Button>
					</>
				) : null}
			</div>
			<div
				data-drawing-control
				className="absolute right-3 top-3 z-30 flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm"
				role="toolbar"
				aria-label="Rasējuma mērogs un pārvietošana"
				onKeyDown={(event) => {
					if (draft || !ready) return;
					const directions: Record<string, [number, number]> = {
						ArrowLeft: [60, 0],
						ArrowRight: [-60, 0],
						ArrowUp: [0, 60],
						ArrowDown: [0, -60],
					};
					const direction = directions[event.key];
					if (direction) {
						event.preventDefault();
						navigation.panBy(...direction);
					}
				}}
			>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Tuvināt"
					title="Tuvināt · bulttaustiņi pārvieto rasējumu"
					disabled={!ready || !!draft || navigation.zoom >= MAX_DRAWING_ZOOM}
					onClick={() => navigation.zoomAt(1.25)}
					className="h-10 w-10 rounded-none"
				>
					<Plus className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Attālināt"
					title="Attālināt"
					disabled={!ready || !!draft || navigation.zoom <= MIN_DRAWING_ZOOM}
					onClick={() => navigation.zoomAt(1 / 1.25)}
					className="h-10 w-10 rounded-none border-t"
				>
					<Minus className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Ietilpināt"
					title="Ietilpināt rasējumu"
					disabled={!ready || !!draft}
					onClick={navigation.reset}
					className="h-10 w-10 rounded-none border-t"
				>
					<Expand className="h-4 w-4" />
				</Button>
			</div>
			<div className="pointer-events-none absolute bottom-3 left-3 right-3 z-30 flex items-end justify-between gap-3">
				<p className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground shadow-sm">
					{draft
						? "Velciet stūrus · + pievieno · Delete noņem"
						: "Velciet, lai pārvietotu · Ritenītis tuvina pie kursora"}
				</p>
				<output
					ref={navigation.scaleLabel}
					className="rounded-md border bg-background px-2 py-1 text-xs tabular-nums shadow-sm"
					aria-label="Mērogs"
				>
					100%
				</output>
			</div>
			{draft ? (
				<p className="sr-only">
					Velciet stūrus. “+” pie malas pievieno stūri. Ar bulttaustiņiem var
					pārvietot izvēlēto stūri; Delete to noņem. Izmaiņas saglabājas tikai
					ar “Saglabāt zonu”.
				</p>
			) : (
				<p className="sr-only">
					Izmantojiet pogas vai peles ritenīti, lai tuvinātu un attālinātu.
				</p>
			)}
			{!validDraft ? (
				<p
					role="alert"
					className="absolute inset-x-3 top-16 z-30 rounded-md border bg-background p-3 text-sm text-destructive"
				>
					Zonas malas krustojas vai laukums ir pārāk mazs. Pielāgojiet stūrus
					pirms saglabāšanas.
				</p>
			) : null}
			{saveError ? (
				<p
					role="alert"
					className="absolute inset-x-3 top-16 z-30 rounded-md border bg-background p-3 text-sm text-destructive"
				>
					{saveError}
				</p>
			) : null}
			{error ? (
				<p
					role="alert"
					className="absolute inset-x-6 top-1/2 z-30 rounded-md bg-background p-4 text-destructive"
				>
					Neizdevās parādīt PDF. Pārbaudiet, vai fails nav bojāts, aizsargāts
					vai garāks par 10 lapām.
				</p>
			) : !ready ? (
				<output className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 rounded-lg border bg-background p-4 text-sm text-muted-foreground shadow-sm">
					Ielādē rasējumu…
				</output>
			) : null}
			<section
				ref={navigation.viewport}
				className={`relative h-[min(70dvh,800px)] min-h-[360px] w-full touch-none select-none overflow-hidden bg-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${draft ? "cursor-default" : navigation.panning ? "cursor-grabbing" : "cursor-grab"}`}
				aria-label="Rasējuma karte"
				onClickCapture={(event) => {
					if (navigation.suppressClick.current) {
						event.preventDefault();
						event.stopPropagation();
						navigation.suppressClick.current = false;
					}
				}}
				data-testid="visual-viewport"
			>
				<div
					ref={surface}
					className="absolute left-0 top-0 origin-top-left bg-white shadow-md will-change-transform"
					style={{
						width: navigation.size.width,
						height: navigation.size.height,
						visibility: ready ? "visible" : "hidden",
					}}
				>
					<canvas
						ref={canvas}
						className="block h-auto w-full"
						aria-label={`Rasējuma ${page}. lapa`}
					/>
					{ready ? (
						<svg
							className="pointer-events-none absolute inset-0 h-full w-full"
							viewBox="0 0 1 1"
							preserveAspectRatio="none"
							aria-label="AI ieteiktās darbu zonas"
							role="img"
						>
							<title>
								AI ieteiktās darbu zonas; atveriet avotu sarakstā, lai
								pārbaudītu.
							</title>
							{shownMarks
								.filter((mark) => mark.page === page)
								.map((mark) => (
									<polygon
										key={mark.id}
										points={mark.polygon
											.map((point) => `${point.x},${point.y}`)
											.join(" ")}
										fill={visualLayers[mark.layer].color}
										fillOpacity={
											highlighted === mark.id
												? 0.8
												: selected === mark.id
													? 0.7
													: 0.5
										}
										stroke={
											highlighted === mark.id
												? "#0f172a"
												: visualLayers[mark.layer].color
										}
										strokeWidth={
											highlighted === mark.id ? 3 : selected === mark.id ? 2 : 1
										}
										vectorEffect="non-scaling-stroke"
										className="transition-[fill-opacity,stroke,stroke-width] duration-100 motion-reduce:transition-none"
									>
										<title>
											{visualLayers[mark.layer].label}: {mark.explanation}
										</title>
									</polygon>
								))}
						</svg>
					) : null}
					{ready
						? shownMarks
								.filter((mark) => mark.page === page)
								.map((mark) => (
									<VisualZoneTarget
										key={`hit-${mark.id}`}
										mark={mark}
										source={evidence.find(
											(item) => item.id === mark.evidenceId,
										)}
										disabled={interactionLocked}
										onHighlight={(active) =>
											setHighlighted((current) =>
												active ? mark.id : current === mark.id ? null : current,
											)
										}
										onSelect={() => onSelect(mark.id)}
									/>
								))
						: null}
					{ready && draft
						? draft.polygon.map((point, i) => (
								<Button
									key={cornerIds[i]}
									size="icon"
									variant="outline"
									disabled={saving}
									aria-label={`Stūris ${i + 1}`}
									className="absolute z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-move touch-none rounded-full border-2 border-primary bg-background"
									style={{
										transform: "scale(var(--drawing-inverse-scale, 1))",
										left: `${point.x * 100}%`,
										top: `${point.y * 100}%`,
									}}
									onPointerDown={(event) => {
										event.stopPropagation();
										event.preventDefault();
										event.currentTarget.focus();
										event.currentTarget.setPointerCapture(event.pointerId);
										drag.current = i;
									}}
									onPointerMove={(event) => {
										if (drag.current !== i || !surface.current) return;
										const rect = surface.current.getBoundingClientRect();
										if (rect.width && rect.height)
											moveCorner(
												i,
												(event.clientX - rect.left) / rect.width,
												(event.clientY - rect.top) / rect.height,
											);
									}}
									onPointerUp={() => {
										drag.current = null;
									}}
									onPointerCancel={() => {
										drag.current = null;
									}}
									onLostPointerCapture={() => {
										drag.current = null;
									}}
									onKeyDown={(event) => {
										const step = event.shiftKey ? 0.01 : 0.002;
										if (
											[
												"ArrowLeft",
												"ArrowRight",
												"ArrowUp",
												"ArrowDown",
											].includes(event.key)
										) {
											event.preventDefault();
											moveCorner(
												i,
												point.x +
													(event.key === "ArrowLeft"
														? -step
														: event.key === "ArrowRight"
															? step
															: 0),
												point.y +
													(event.key === "ArrowUp"
														? -step
														: event.key === "ArrowDown"
															? step
															: 0),
											);
										}
										if (
											(event.key === "Delete" || event.key === "Backspace") &&
											draft.polygon.length > 3
										) {
											event.preventDefault();
											setCornerIds(cornerIds.filter((_, index) => index !== i));
											setDraft({
												...draft,
												polygon: draft.polygon.filter(
													(_, index) => index !== i,
												),
											});
										}
									}}
								/>
							))
						: null}
					{ready && draft && draft.polygon.length < 40
						? draft.polygon.map((point, i) => {
								const next = draft.polygon[(i + 1) % draft.polygon.length];
								return (
									<Button
										key={`edge-${cornerIds[i]}`}
										size="icon"
										variant="outline"
										disabled={saving}
										aria-label={`Pievienot stūri pie malas ${i + 1}`}
										className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full text-xs"
										style={{
											transform: "scale(var(--drawing-inverse-scale, 1))",
											left: `${(point.x + next.x) * 50}%`,
											top: `${(point.y + next.y) * 50}%`,
										}}
										onClick={() => {
											const polygon = [...draft.polygon];
											const ids = [...cornerIds];
											ids.splice(i + 1, 0, `corner-${nextCornerId.current++}`);
											setCornerIds(ids);
											polygon.splice(i + 1, 0, {
												x: (point.x + next.x) / 2,
												y: (point.y + next.y) / 2,
											});
											setDraft({ ...draft, polygon });
										}}
									>
										+
									</Button>
								);
							})
						: null}
				</div>
			</section>
		</div>
	);
}
