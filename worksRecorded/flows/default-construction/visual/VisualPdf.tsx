"use client";

import {
	ChevronLeft,
	ChevronRight,
	Expand,
	Minus,
	MousePointer2,
	Pencil,
	Plus,
	Trash2,
	X,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { type VisualMark, visualLayers } from "./model";
import {
	nextVisualPlanAreaId,
	replaceVisualPlanArea,
} from "./planning-geometry";
import { type VisualPlanArea, visualPlanAreaSchema } from "./planning-model";
import {
	type PolygonDelete,
	type PolygonEdit,
	polygonEditSchema,
} from "./polygon-edit";
import { useDrawingViewport } from "./useDrawingViewport";
import { type AreaPenMode, VisualAreaPen } from "./VisualAreaPen";
import { VisualPdfDetail } from "./VisualPdfDetail";
import { VisualPlanAreaTarget } from "./VisualPlanAreaTarget";
import { VisualPolygonEditor } from "./VisualPolygonEditor";
import { VisualZoneTarget } from "./VisualZoneTarget";
import { MAX_DRAWING_ZOOM, MIN_DRAWING_ZOOM } from "./viewport";
import type { VisualClientCache } from "./visual-client-cache";

export type VisualPlanAreaSelection = {
	planId: string | null;
	areaId: string;
};

export type VisualPdfPlanning = {
	planId: string | null;
	areas: VisualPlanArea[];
	backgroundAreas?: Array<
		VisualPlanArea & { planId: string; color?: string; label?: string }
	>;
	selectedArea: VisualPlanAreaSelection | null;
	areaRequest?: number;
	color?: string;
	label?: string;
	interactionKey?: string;
	editable?: boolean;
	onChange: (areas: VisualPlanArea[]) => void;
	onSelectArea: (selection: VisualPlanAreaSelection | null) => void;
	onEditingChange?: (editing: boolean) => void;
};

type PlanningAreaDraft = {
	area: VisualPlanArea;
	isNew: boolean;
};

type LayerPickerOption = {
	key: string;
	label: string;
	color: string;
	select: () => void;
};

type LayerHitOption = LayerPickerOption & {
	polygon: Array<{ x: number; y: number }>;
};

type LayerPicker = {
	x: number;
	y: number;
	options: LayerPickerOption[];
};

export function visualPointInPolygon(
	point: { x: number; y: number },
	polygon: Array<{ x: number; y: number }>,
) {
	let inside = false;
	for (
		let index = 0, previous = polygon.length - 1;
		index < polygon.length;
		previous = index++
	) {
		const currentPoint = polygon[index];
		const previousPoint = polygon[previous];
		const crosses =
			currentPoint.y > point.y !== previousPoint.y > point.y &&
			point.x <
				((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
					(previousPoint.y - currentPoint.y) +
					currentPoint.x;
		if (crosses) inside = !inside;
	}
	return inside;
}

function createVisualPlanArea(areas: VisualPlanArea[], page: number) {
	return {
		id: nextVisualPlanAreaId(areas),
		page,
		polygon: [
			{ x: 0.35, y: 0.35 },
			{ x: 0.65, y: 0.35 },
			{ x: 0.65, y: 0.65 },
			{ x: 0.35, y: 0.65 },
		],
	} satisfies VisualPlanArea;
}

export function VisualPdf({
	url,
	marks,
	selected,
	onSelect,
	editable = false,
	deletable = true,
	onSave,
	onQueueSave,
	onEditingChange,
	fillWorkspace = false,
	onDelete,
	planning,
	layerStyles = visualLayers,
	resourceCache,
	controlsHost,
	onDocumentChange,
}: {
	url: string;
	marks: VisualMark[];
	selected: string | null;
	onSelect: (id: string | null) => void;
	editable?: boolean;
	deletable?: boolean;
	onSave?: (edit: PolygonEdit) => Promise<void>;
	onQueueSave?: (edit: PolygonEdit) => void;
	onEditingChange?: (editing: boolean) => void;
	fillWorkspace?: boolean;
	onDelete?: (deletion: PolygonDelete) => void;
	planning?: VisualPdfPlanning;
	layerStyles?: Record<string, { label: string; color: string }>;
	resourceCache?: VisualClientCache;
	controlsHost?: HTMLElement | null;
	onDocumentChange?: (document: PDFDocumentProxy | null) => void;
}) {
	const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
	useEffect(() => {
		onDocumentChange?.(document);
		return () => onDocumentChange?.(null);
	}, [document, onDocumentChange]);
	const [page, setPage] = useState(1);
	const [aspect, setAspect] = useState(1);
	const [error, setError] = useState(false);
	const [ready, setReady] = useState(false);
	const [highlighted, setHighlighted] = useState<string | null>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const [draft, setDraft] = useState<PolygonEdit | null>(null);
	const [planningAreaDraft, setPlanningAreaDraft] =
		useState<PlanningAreaDraft | null>(null);
	const [penMode, setPenMode] = useState<AreaPenMode | null>(null);
	const newAreaMethod = useRef<AreaPenMode | "rectangle">("rectangle");
	const [layerPicker, setLayerPicker] = useState<LayerPicker | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const handledAreaRequest = useRef(planning?.areaRequest ?? 0);
	const planningInteractionKey = planning?.interactionKey ?? planning?.planId;
	const previousPlanningInteractionKey = useRef(planningInteractionKey);
	const planningEnabled = planning !== undefined;
	const navigation = useDrawingViewport(
		aspect,
		`${url}:${page}`,
		ready && !saving,
		penMode !== null,
	);
	const { surface } = navigation;
	const interactionLocked = !!draft || planningEnabled || navigation.panning;
	useEffect(() => {
		if (previousPlanningInteractionKey.current === planningInteractionKey)
			return;
		previousPlanningInteractionKey.current = planningInteractionKey;
		setPlanningAreaDraft(null);
		setPenMode(null);
		setLayerPicker(null);
	}, [planningInteractionKey]);
	useEffect(() => {
		setHighlighted((current) =>
			interactionLocked ||
			!marks.some((mark) => mark.id === current && mark.page === page)
				? null
				: current,
		);
	}, [page, interactionLocked, marks]);
	const selectedMark = marks.find((mark) => mark.id === selected);
	const shownPlanningAreas = planning
		? planningAreaDraft?.isNew
			? [...planning.areas, planningAreaDraft.area]
			: planningAreaDraft
				? replaceVisualPlanArea(planning.areas, planningAreaDraft.area)
				: planning.areas
		: [];
	const selectedPlanArea = shownPlanningAreas.find(
		(area) =>
			area.id === planning?.selectedArea?.areaId &&
			planning?.selectedArea?.planId === planning?.planId,
	);
	const planningEditable = planning?.editable !== false;
	const planningColor = planning?.color ?? visualLayers.other.color;
	const selectedPlanAreaValid = selectedPlanArea
		? visualPlanAreaSchema.safeParse(selectedPlanArea).success
		: true;
	const editingArea = !!draft || !!planningAreaDraft || !!penMode;
	const areaControlsActive =
		editingArea ||
		(planning
			? planningEditable && !!selectedPlanArea
			: !!selectedMark && (!!onSave || !!onDelete));
	const shownMarks = marks.map((mark) =>
		draft?.markId === mark.id ? { ...mark, polygon: draft.polygon } : mark,
	);
	const validDraft = draft ? polygonEditSchema.safeParse(draft).success : true;
	function endEditing() {
		setDraft(null);
		setSaveError(null);
		onEditingChange?.(false);
	}
	function updatePlanArea(area: VisualPlanArea) {
		if (!planningAreaDraft) return;
		setPlanningAreaDraft({ ...planningAreaDraft, area });
	}
	function addPlanArea() {
		if (
			!planning ||
			!planningEditable ||
			planningAreaDraft ||
			planning.areas.length >= 50
		)
			return;
		newAreaMethod.current = "rectangle";
		const area = createVisualPlanArea(planning.areas, page);
		setPlanningAreaDraft({ area, isNew: true });
		planning.onSelectArea({ planId: planning.planId, areaId: area.id });
		planning.onEditingChange?.(true);
		setLayerPicker(null);
	}
	function startAreaPen(mode: AreaPenMode) {
		if (
			!planning ||
			!planningEditable ||
			planningAreaDraft ||
			planning.areas.length >= 50
		)
			return;
		navigation.freeze();
		newAreaMethod.current = mode;
		setPenMode(mode);
		planning.onSelectArea(null);
		planning.onEditingChange?.(true);
		setLayerPicker(null);
	}
	function cancelAreaPen() {
		setPenMode(null);
		planning?.onEditingChange?.(false);
	}
	function editPlanArea() {
		if (!planning || !selectedPlanArea || planningAreaDraft) return;
		newAreaMethod.current = "polygon";
		setPlanningAreaDraft({
			area: {
				...selectedPlanArea,
				polygon: selectedPlanArea.polygon.map((point) => ({ ...point })),
			},
			isNew: false,
		});
		planning.onEditingChange?.(true);
		setLayerPicker(null);
	}
	function finishPlanAreaEditing(addAnother = false) {
		if (!planning || !planningAreaDraft || !selectedPlanAreaValid) return;
		const areas = planningAreaDraft.isNew
			? [...planning.areas, planningAreaDraft.area]
			: replaceVisualPlanArea(planning.areas, planningAreaDraft.area);
		planning.onChange(areas);
		if (addAnother && areas.length < 50) {
			if (newAreaMethod.current !== "rectangle") {
				setPlanningAreaDraft(null);
				setPenMode(newAreaMethod.current);
				planning.onSelectArea(null);
				return;
			}
			const area = createVisualPlanArea(areas, page);
			setPlanningAreaDraft({ area, isNew: true });
			planning.onSelectArea({ planId: planning.planId, areaId: area.id });
			return;
		}
		setPlanningAreaDraft(null);
		planning.onEditingChange?.(false);
	}
	function cancelPlanAreaEditing() {
		if (!planningAreaDraft) return;
		if (planningAreaDraft.isNew) planning?.onSelectArea(null);
		setPlanningAreaDraft(null);
		planning?.onEditingChange?.(false);
	}
	function selectLayerAtPoint(
		clientX: number,
		clientY: number,
		candidates: LayerHitOption[],
		fallback: LayerPickerOption,
	) {
		if (planningAreaDraft) {
			fallback.select();
			return;
		}
		const surfaceRect = surface.current?.getBoundingClientRect();
		const viewportRect = navigation.viewport.current?.getBoundingClientRect();
		if (
			!surfaceRect?.width ||
			!surfaceRect.height ||
			!viewportRect?.width ||
			!viewportRect.height
		) {
			fallback.select();
			return;
		}
		const point = {
			x: (clientX - surfaceRect.left) / surfaceRect.width,
			y: (clientY - surfaceRect.top) / surfaceRect.height,
		};
		const matches = candidates.filter((candidate) =>
			visualPointInPolygon(point, candidate.polygon),
		);
		if (matches.length <= 1) {
			fallback.select();
			return;
		}
		const pickerWidth = 248;
		setLayerPicker({
			x: Math.max(
				8,
				Math.min(
					clientX - viewportRect.left + 10,
					viewportRect.width - pickerWidth,
				),
			),
			y: Math.max(
				8,
				Math.min(clientY - viewportRect.top + 10, viewportRect.height - 92),
			),
			options: [...matches].reverse().map((candidate, index) => ({
				...candidate,
				label: `${index === 0 ? "Augšējais" : index === matches.length - 1 ? "Apakšējais" : `Slānis ${index + 1}`} · ${candidate.label}`,
			})),
		});
	}
	async function save() {
		if (!draft || (!onSave && !onQueueSave) || !validDraft || saving) return;
		if (onQueueSave) {
			try {
				onQueueSave(draft);
				endEditing();
			} catch (error) {
				setSaveError(
					error instanceof Error ? error.message : "Neizdevās saglabāt zonu.",
				);
			}
			return;
		}
		if (!onSave) return;
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
		const targetPage = selectedPlanArea?.page ?? selectedPage;
		if (targetPage) setPage(targetPage);
	}, [selectedPage, selectedPlanArea?.page]);
	useEffect(() => {
		const request = planning?.areaRequest ?? 0;
		if (!planning) {
			handledAreaRequest.current = request;
			return;
		}
		if (
			!planningEditable ||
			planningAreaDraft ||
			penMode ||
			planning.areas.length >= 50 ||
			!ready ||
			request <= handledAreaRequest.current
		)
			return;
		handledAreaRequest.current = request;
		newAreaMethod.current = "polygon";
		setPenMode("polygon");
		planning.onSelectArea(null);
		planning.onEditingChange?.(true);
		setLayerPicker(null);
	}, [planning, planningAreaDraft, penMode, planningEditable, ready]);
	useEffect(() => {
		let active = true;
		let task:
			| ReturnType<typeof import("pdfjs-dist")["getDocument"]>
			| undefined;
		const abort = new AbortController();
		const cachedPdf = resourceCache?.openPdf(url);
		setDocument(null);
		setHighlighted(null);
		setError(false);
		setReady(false);
		setPage(1);
		void (async () => {
			try {
				if (cachedPdf) {
					const pdf = await cachedPdf.promise;
					if (active) setDocument(pdf);
					return;
				}
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
			cachedPdf?.release();
			void task?.destroy();
		};
	}, [url, resourceCache]);
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
				const overviewWidth = Math.min(
					1800,
					Math.sqrt((4_000_000 * base.width) / base.height),
					(4096 * base.width) / base.height,
				);
				const viewport = pdfPage.getViewport({
					scale: overviewWidth / base.width,
				});
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
	const actualLayerCandidates: LayerHitOption[] = shownMarks
		.filter((mark) => mark.page === page)
		.map((mark) => ({
			key: mark.id,
			label: `${(layerStyles[mark.layer] ?? visualLayers.other).label}: ${mark.explanation}`,
			color: (layerStyles[mark.layer] ?? visualLayers.other).color,
			polygon: mark.polygon,
			select: () => onSelect(mark.id),
		}));
	const planningLayerCandidates = planning
		? [
				...(planning.backgroundAreas ?? []).map((area) => ({
					area,
					planId: area.planId,
					color: area.color ?? visualLayers.other.color,
					label: area.label ?? "Cits plāns",
				})),
				...shownPlanningAreas.map((area) => ({
					area,
					planId: planning.planId,
					color: planningColor,
					label: planning.label ?? "Aktīvais plāns",
				})),
			].filter(({ area }) => area.page === page)
		: [];
	const planningHitCandidates: LayerHitOption[] = planningLayerCandidates.map(
		({ area, planId, color, label }, index) => ({
			key: `${planId ?? "draft"}:${area.id}`,
			label: `${label} · zona ${index + 1}`,
			color,
			polygon: area.polygon,
			select: () => planning?.onSelectArea({ planId, areaId: area.id }),
		}),
	);
	const activePlanGroupSelected =
		!!planning?.selectedArea &&
		planning.selectedArea.planId === planning.planId;
	const controlsDocked = controlsHost !== undefined;
	const controls = (
		<div
			data-drawing-control
			role="toolbar"
			aria-label="Rasējuma zīmēšanas rīki"
			data-area-editing={editingArea ? "true" : undefined}
			data-area-controls={areaControlsActive ? "true" : undefined}
			className={`flex flex-wrap items-center gap-1 ${controlsDocked ? "min-w-0 flex-1 basis-80" : `absolute top-3 z-30 max-w-[calc(100%-5rem)] rounded-lg border bg-background p-1 shadow-sm transition-[left,transform] duration-150 motion-reduce:transition-none ${areaControlsActive ? "left-1/2 -translate-x-1/2 justify-center" : "left-3"}`}`}
		>
			<Button
				variant="outline"
				size="icon"
				className="h-8 w-8 border-0 shadow-none"
				aria-label="Iepriekšējā lapa"
				disabled={!!draft || !!planningAreaDraft || !!penMode || page <= 1}
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
				disabled={
					!!draft ||
					!!planningAreaDraft ||
					!!penMode ||
					!document ||
					page >= document.numPages
				}
				onClick={() => setPage((value) => value + 1)}
			>
				<ChevronRight className="h-4 w-4" />
			</Button>
			{planning && planningEditable && !planningAreaDraft && !penMode ? (
				<>
					<Button
						size="sm"
						variant="outline"
						disabled={!ready || planning.areas.length >= 50}
						onClick={() => startAreaPen("polygon")}
					>
						<Pencil className="h-3.5 w-3.5" /> Zīmēt zonu
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={!ready || planning.areas.length >= 50}
						onClick={() => startAreaPen("freehand")}
					>
						Brīvrokas zona
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={!ready || planning.areas.length >= 50}
						onClick={addPlanArea}
					>
						<MousePointer2 className="h-3.5 w-3.5" />
						Taisnstūris
					</Button>
				</>
			) : null}
			{planning &&
			planningEditable &&
			selectedPlanArea &&
			!planningAreaDraft &&
			!penMode ? (
				<Button
					size="sm"
					variant="outline"
					aria-label="Pielāgot plānoto zonu"
					onClick={editPlanArea}
				>
					<Pencil className="h-3.5 w-3.5 md:mr-1" />
					<span className="hidden md:inline">Pielāgot zonu</span>
				</Button>
			) : null}
			{planning &&
			planningEditable &&
			selectedPlanArea &&
			!planningAreaDraft &&
			!penMode ? (
				<Button
					size="icon"
					variant="ghost"
					className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
					aria-label="Dzēst plānoto zonu"
					title="Dzēst izvēlēto plānoto zonu"
					onClick={() => {
						planning.onChange(
							planning.areas.filter((area) => area.id !== selectedPlanArea.id),
						);
						planning.onSelectArea(null);
					}}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			) : null}
			{planningAreaDraft ? (
				<>
					<Button
						size="sm"
						disabled={!selectedPlanAreaValid}
						onClick={() => finishPlanAreaEditing()}
					>
						Saglabāt zonu
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={
							!selectedPlanAreaValid ||
							(planning?.areas.length ?? 50) +
								(planningAreaDraft.isNew ? 1 : 0) >=
								50
						}
						onClick={() => finishPlanAreaEditing(true)}
					>
						<Plus className="h-3.5 w-3.5" />
						Saglabāt un pievienot nākamo
					</Button>
					<Button size="sm" variant="outline" onClick={cancelPlanAreaEditing}>
						Atcelt
					</Button>
				</>
			) : null}
			{(onSave || onQueueSave) && !planning && !draft ? (
				<Button
					size="sm"
					variant="outline"
					className="w-8 px-0 md:w-auto md:px-3"
					aria-label="Pielāgot zonu"
					title="Pielāgot zonu"
					disabled={!editable || !selectedMark || !ready}
					onClick={() => {
						if (!selectedMark) return;
						navigation.freeze();
						setDraft({
							markId: selectedMark.id,
							expectedPolygon: selectedMark.polygon,
							polygon: selectedMark.polygon.map((point) => ({ ...point })),
						});
						onEditingChange?.(true);
					}}
				>
					<Pencil className="h-3.5 w-3.5 md:mr-1" />
					<span className="hidden md:inline">Pielāgot zonu</span>
				</Button>
			) : null}
			{onDelete && !planning && !draft ? (
				<Button
					size="icon"
					variant="ghost"
					className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
					aria-label="Dzēst poligonu"
					title="Dzēst tikai izvēlēto poligonu"
					disabled={!editable || !deletable || !selectedMark || !ready}
					onClick={() => {
						if (selectedMark)
							onDelete({
								markId: selectedMark.id,
								expectedPolygon: selectedMark.polygon.map((point) => ({
									...point,
								})),
							});
					}}
				>
					<Trash2 className="h-4 w-4" />
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
	);
	const zoomControls = (
		<div
			data-drawing-control
			className={`flex overflow-hidden rounded-lg border bg-background ${controlsDocked ? "shrink-0 items-center" : "absolute right-3 top-3 z-30 flex-col shadow-sm"}`}
			role="toolbar"
			aria-label="Rasējuma mērogs un pārvietošana"
			onKeyDown={(event) => {
				if (saving || !ready) return;
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
				disabled={!ready || saving || navigation.zoom >= MAX_DRAWING_ZOOM}
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
				disabled={!ready || saving || navigation.zoom <= MIN_DRAWING_ZOOM}
				onClick={() => navigation.zoomAt(1 / 1.25)}
				className={`h-10 w-10 rounded-none ${controlsDocked ? "border-l" : "border-t"}`}
			>
				<Minus className="h-4 w-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				aria-label="Ietilpināt"
				title="Ietilpināt rasējumu"
				disabled={!ready || saving}
				onClick={navigation.reset}
				className={`h-10 w-10 rounded-none ${controlsDocked ? "border-l" : "border-t"}`}
			>
				<Expand className="h-4 w-4" />
			</Button>
		</div>
	);
	return (
		<div
			className={`relative min-w-0 overflow-hidden bg-muted/40 ${fillWorkspace ? "h-full" : "rounded-xl border"}`}
		>
			{controlsDocked ? (
				controlsHost ? (
					createPortal(
						<div className="flex w-full flex-wrap items-center justify-between gap-2">
							{controls}
							{zoomControls}
						</div>,
						controlsHost,
					)
				) : null
			) : (
				<>
					{controls}
					{zoomControls}
				</>
			)}
			{layerPicker ? (
				<div
					data-drawing-control
					role="dialog"
					aria-label="Pārklājošās zonas"
					className="absolute z-50 w-[248px] overflow-hidden rounded-lg border bg-background shadow-xl"
					style={{ left: layerPicker.x, top: layerPicker.y }}
					onKeyDown={(event) => {
						if (event.key === "Escape") setLayerPicker(null);
					}}
				>
					<div className="flex items-center justify-between gap-2 border-b px-2.5 py-2">
						<p className="text-xs font-medium">Izvēlieties zonu šajā vietā</p>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							aria-label="Aizvērt zonu izvēli"
							onClick={() => setLayerPicker(null)}
						>
							<X className="h-3.5 w-3.5" />
						</Button>
					</div>
					<div className="space-y-0.5 p-1">
						{layerPicker.options.map((option) => (
							<button
								key={option.key}
								type="button"
								className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onClick={() => {
									option.select();
									setLayerPicker(null);
								}}
							>
								<span
									aria-hidden="true"
									className="h-2.5 w-2.5 shrink-0 rounded-sm"
									style={{ backgroundColor: option.color }}
								/>
								<span className="truncate">{option.label}</span>
							</button>
						))}
					</div>
				</div>
			) : null}
			<div className="pointer-events-none absolute bottom-3 left-3 right-3 z-30 flex items-end justify-between gap-3">
				<p className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground shadow-sm">
					{penMode
						? penMode === "polygon"
							? "Klikšķiniet stūrus · Dubultklikšķis vai pirmais punkts aizver · Shift + velciet pārvieto · Esc atceļ"
							: "Velciet ar peli vai irbuli · Atlaižot kontūra aizveras · Shift + velciet pārvieto · Esc atceļ"
						: planningAreaDraft && selectedPlanArea
							? "Velciet zonu vai tās stūrus · + pievieno · Delete noņem stūri"
							: draft
								? "Velciet zonu vai tās stūrus · + pievieno · Delete noņem stūri"
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
			{planningAreaDraft && selectedPlanArea ? (
				<p className="sr-only">
					Velciet plānoto zonu, lai pārvietotu visu laukumu, vai velciet tās
					stūrus. “+” pie malas pievieno stūri; Delete to noņem.
				</p>
			) : draft ? (
				<p className="sr-only">
					Velciet zonu vai tās stūrus. “+” pie malas pievieno stūri. Ar
					bulttaustiņiem var pārvietot izvēlēto stūri; Delete to noņem. Izmaiņas
					saglabājas tikai ar “Saglabāt zonu”.
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
			{!selectedPlanAreaValid ? (
				<p
					role="alert"
					className="absolute inset-x-3 top-16 z-30 rounded-md border bg-background p-3 text-sm text-destructive"
				>
					Plānotās zonas malas krustojas vai laukums ir pārāk mazs. Pielāgojiet
					stūrus pirms plāna saglabāšanas.
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
				className={`relative ${fillWorkspace ? "h-full min-h-0" : "h-[min(70dvh,800px)] min-h-[360px]"} w-full touch-none select-none overflow-hidden bg-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${navigation.panning ? "cursor-grabbing" : "cursor-grab"}`}
				aria-label="Rasējuma karte"
				onClickCapture={(event) => {
					if (navigation.suppressClick.current) {
						event.preventDefault();
						event.stopPropagation();
						navigation.suppressClick.current = false;
						return;
					}
					if (penMode) return;
					if (
						event.target === event.currentTarget ||
						event.target === surface.current ||
						event.target === canvas.current
					)
						setLayerPicker(null);
					if (
						ready &&
						selected &&
						!interactionLocked &&
						(event.target === event.currentTarget ||
							event.target === surface.current ||
							event.target === canvas.current)
					) {
						setHighlighted(null);
						onSelect(null);
					}
					if (
						ready &&
						planning &&
						planning.selectedArea &&
						(event.target === event.currentTarget ||
							event.target === surface.current ||
							event.target === canvas.current)
					)
						planning.onSelectArea(null);
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
					{document && ready ? (
						<VisualPdfDetail
							key={`${url}:${page}`}
							document={document}
							page={page}
							pageWidth={navigation.size.width}
							pageHeight={navigation.size.height}
							overviewWidth={canvas.current?.width ?? 0}
							view={navigation.settledView}
							enabled={!navigation.panning}
						/>
					) : null}
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
								.sort(
									(a, b) =>
										Number(a.id === selected) - Number(b.id === selected),
								)
								.map((mark) => (
									<polygon
										key={mark.id}
										points={mark.polygon
											.map((point) => `${point.x},${point.y}`)
											.join(" ")}
										fill={(layerStyles[mark.layer] ?? visualLayers.other).color}
										fillOpacity={
											selected === mark.id
												? 0.85
												: highlighted === mark.id
													? 0.8
													: 0.5
										}
										stroke={
											highlighted === mark.id || selected === mark.id
												? "#0f172a"
												: (layerStyles[mark.layer] ?? visualLayers.other).color
										}
										strokeWidth={
											selected === mark.id ? 4 : highlighted === mark.id ? 3 : 1
										}
										vectorEffect="non-scaling-stroke"
										className="transition-[fill-opacity,stroke,stroke-width] duration-100 motion-reduce:transition-none"
									>
										<title>
											{(layerStyles[mark.layer] ?? visualLayers.other).label}:{" "}
											{mark.explanation}
										</title>
									</polygon>
								))}
						</svg>
					) : null}
					{ready && planning ? (
						<svg
							className="pointer-events-none absolute inset-0 h-full w-full"
							viewBox="0 0 1 1"
							preserveAspectRatio="none"
							aria-label="Plānotās darbu zonas"
							role="img"
						>
							<title>
								Plānotās darbu zonas ir attēlotas ar pārtrauktu kontūru.
							</title>
							{planning.backgroundAreas
								?.filter((area) => area.page === page)
								.map((area) => (
									<polygon
										key={`background-${area.planId}-${area.id}`}
										data-plan-background={`${area.planId}:${area.id}`}
										points={area.polygon
											.map((point) => `${point.x},${point.y}`)
											.join(" ")}
										fill={area.color ?? visualLayers.other.color}
										fillOpacity={0.22}
										stroke={area.color ?? visualLayers.other.color}
										strokeOpacity={0.8}
										strokeWidth={1.5}
										strokeDasharray="5 5"
										vectorEffect="non-scaling-stroke"
									/>
								))}
							{shownPlanningAreas
								.filter((area) => area.page === page)
								.map((area) => {
									const directlySelected = selectedPlanArea?.id === area.id;
									return (
										<polygon
											key={area.id}
											data-plan-area={area.id}
											data-plan-area-selected={
												directlySelected ? "true" : undefined
											}
											data-plan-group-selected={
												activePlanGroupSelected ? "true" : undefined
											}
											points={area.polygon
												.map((point) => `${point.x},${point.y}`)
												.join(" ")}
											fill={planningColor}
											fillOpacity={
												directlySelected
													? 0.64
													: activePlanGroupSelected
														? 0.48
														: 0.34
											}
											stroke={
												directlySelected
													? "#0f172a"
													: activePlanGroupSelected
														? "#334155"
														: planningColor
											}
											strokeWidth={
												directlySelected ? 4 : activePlanGroupSelected ? 3 : 2
											}
											strokeDasharray={directlySelected ? "4 3" : "8 5"}
											vectorEffect="non-scaling-stroke"
										/>
									);
								})}
						</svg>
					) : null}
					{ready
						? shownMarks
								.filter((mark) => mark.page === page)
								.map((mark) => (
									<VisualZoneTarget
										layerLabel={
											(layerStyles[mark.layer] ?? visualLayers.other).label
										}
										key={`hit-${mark.id}`}
										mark={mark}
										selected={selected === mark.id}
										disabled={interactionLocked}
										onHighlight={(active) =>
											setHighlighted((current) =>
												active ? mark.id : current === mark.id ? null : current,
											)
										}
										onSelect={(event) => {
											const fallback = actualLayerCandidates.find(
												(candidate) => candidate.key === mark.id,
											);
											if (fallback)
												selectLayerAtPoint(
													event.clientX,
													event.clientY,
													actualLayerCandidates,
													fallback,
												);
										}}
									/>
								))
						: null}
					{ready && planning && !penMode
						? planningLayerCandidates.map(({ area, planId }, index) => {
								const key = `${planId ?? "draft"}:${area.id}`;
								const fallback = planningHitCandidates.find(
									(candidate) => candidate.key === key,
								);
								const movable =
									planningAreaDraft?.area.id === area.id &&
									planId === planning.planId;
								return (
									<VisualPlanAreaTarget
										key={`plan-hit-${key}`}
										area={area}
										label={`Plānotā zona ${index + 1}`}
										disabled={!!planningAreaDraft && !movable}
										movable={movable}
										selected={
											planning.selectedArea?.planId === planId &&
											planning.selectedArea.areaId === area.id
										}
										surface={surface.current}
										onSelect={(event) => {
											if (fallback)
												selectLayerAtPoint(
													event.clientX,
													event.clientY,
													planningHitCandidates,
													fallback,
												);
										}}
										onMove={movable ? updatePlanArea : () => {}}
									/>
								);
							})
						: null}
					{ready && draft ? (
						<>
							<VisualPlanAreaTarget
								area={{ id: draft.markId, page, polygon: draft.polygon }}
								label="Pārvietot zonu"
								disabled={saving}
								selected
								surface={surface.current}
								onSelect={() => {}}
								onMove={(area) =>
									setDraft((current) =>
										current ? { ...current, polygon: area.polygon } : current,
									)
								}
							/>
							<VisualPolygonEditor
								key={draft.markId}
								area={{ id: draft.markId, page, polygon: draft.polygon }}
								surface={surface}
								disabled={saving}
								onChange={(area) =>
									setDraft((current) =>
										current ? { ...current, polygon: area.polygon } : current,
									)
								}
							/>
						</>
					) : null}
					{ready && planningAreaDraft && selectedPlanArea?.page === page ? (
						<VisualPolygonEditor
							key={selectedPlanArea.id}
							area={selectedPlanArea}
							surface={surface}
							planned
							onChange={updatePlanArea}
						/>
					) : null}
					{ready && planning && penMode ? (
						<VisualAreaPen
							key={`${planningInteractionKey}:${page}:${penMode}`}
							mode={penMode}
							surface={surface}
							viewport={navigation.viewport}
							color={planningColor}
							onCancel={cancelAreaPen}
							onComplete={(polygon) => {
								const area = {
									id: nextVisualPlanAreaId(planning.areas),
									page,
									polygon,
								};
								setPlanningAreaDraft({ area, isNew: true });
								setPenMode(null);
								planning.onSelectArea({
									planId: planning.planId,
									areaId: area.id,
								});
							}}
						/>
					) : null}
				</div>
			</section>
		</div>
	);
}
