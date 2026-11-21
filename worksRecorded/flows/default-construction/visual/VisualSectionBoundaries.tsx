"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Pair } from "polygon-clipping";
import { useEffect, useMemo, useState } from "react";
import { useWorkspaceActive } from "@/components/projects/WorkspaceActivity";
import { Button } from "@/components/ui/button";
import type { VisualDrawing, VisualMark } from "./model";
import { VISUAL_MAX_POLYGON_POINTS } from "./model";
import {
	type SectionBoundary,
	type SectionBoundaryCode,
	type SectionBoundaryMap,
	sectionBoundaryStyles,
} from "./section-boundaries";
import { type AreaPenMode, VisualAreaPen } from "./VisualAreaPen";
import { VisualPdf } from "./VisualPdf";
import { VisualPlanAreaTarget } from "./VisualPlanAreaTarget";
import { VisualPolygonEditor } from "./VisualPolygonEditor";
import type { VisualClientCache } from "./visual-client-cache";
import {
	replaceZoneRing,
	translateZoneComponent,
	zoneGeometryPath,
	zoneRingPoints,
} from "./zone-geometry";

const emptyMarks: VisualMark[] = [];
const emptySections: SectionBoundary[] = [];
const selectClass = "h-8 rounded-md border bg-background px-2 text-xs";
type MapResult = { map: SectionBoundaryMap | null; failed: boolean };
type Selection = {
	revision: string | null;
	code: SectionBoundaryCode;
	polygon: number | null;
	ring: number;
};

export function VisualSectionBoundaries({
	active,
	drawing,
	resourceCache,
	onEditingChange,
}: {
	active: boolean;
	drawing: VisualDrawing;
	resourceCache: VisualClientCache;
	onEditingChange: (editing: boolean) => void;
}) {
	const endpoint = resourceCache.endpoint(drawing.id);
	const url = `${endpoint}?boundaries=1`;
	const workspaceActive = useWorkspaceActive();
	const [result, setResult] = useState<MapResult | null>(() => {
		const map = resourceCache.peekSectionBoundaries(drawing.id);
		return map === undefined ? null : { map, failed: false };
	});
	const [edit, setEdit] = useState<{
		base: SectionBoundaryMap;
		sections: SectionBoundary[];
	} | null>(null);
	const editing = edit !== null;
	const [selection, setSelection] = useState<Selection | null>(null);
	const [penMode, setPenMode] = useState<AreaPenMode | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	useEffect(() => {
		if (!workspaceActive || editing) return;
		let cancelled = false;
		const refresh = () => {
			void resourceCache.loadSectionBoundaries(drawing.id).then(
				(map) => {
					if (!cancelled) setResult({ map, failed: false });
				},
				() => {
					if (!cancelled)
						setResult((current) => current ?? { map: null, failed: true });
				},
			);
		};
		refresh();
		if (active) window.addEventListener("focus", refresh);
		return () => {
			cancelled = true;
			if (active) window.removeEventListener("focus", refresh);
		};
	}, [resourceCache, drawing.id, workspaceActive, editing, active]);
	useEffect(() => () => onEditingChange(false), [onEditingChange]);

	const map = edit?.base ?? result?.map;
	const draft = edit?.sections;
	const sections = draft ?? map?.sections ?? emptySections;
	const currentSelection =
		selection?.revision === map?.revision ? selection : null;
	const chosen =
		sections.find(({ code }) => code === currentSelection?.code) ?? sections[0];
	const polygonIndex = currentSelection?.polygon ?? null;
	const ringIndex = currentSelection?.ring ?? 0;
	const polygon =
		polygonIndex === null ? undefined : chosen?.geometry[polygonIndex];
	const editedRing = polygon?.[ringIndex];
	const changed = !!draft && draft !== map?.sections;
	const shapes = useMemo(
		() =>
			sections.flatMap(({ code, geometry }) =>
				geometry.map((part, index) => ({
					code,
					index,
					path: zoneGeometryPath([part]),
				})),
			),
		[sections],
	);

	function selectPolygon(code: SectionBoundaryCode, polygon: number | null) {
		setSelection({ revision: map?.revision ?? null, code, polygon, ring: 0 });
	}

	function finishEditing() {
		setEdit(null);
		setSelection(null);
		setPenMode(null);
		setSaveError(null);
		onEditingChange(false);
	}

	function cancelEditing() {
		void resourceCache
			.loadSectionBoundaries(drawing.id, { force: true })
			.catch(() => {});
		finishEditing();
	}

	function startEditing() {
		if (!map || edit) return;
		setEdit({ base: map, sections: map.sections });
		onEditingChange(true);
	}

	function startDrawing(mode: AreaPenMode) {
		if (!chosen) return;
		startEditing();
		selectPolygon(chosen.code, null);
		setPenMode(mode);
	}

	function deletePolygon() {
		if (!map || !chosen || polygonIndex === null) return;
		startEditing();
		changeGeometry(
			chosen.code,
			chosen.geometry.filter((_, index) => index !== polygonIndex),
		);
		selectPolygon(chosen.code, null);
	}

	function changeGeometry(
		code: SectionBoundaryCode,
		geometry: SectionBoundary["geometry"],
	) {
		setEdit(
			(previous) =>
				previous && {
					...previous,
					sections: previous.sections.map((section) =>
						code === section.code ? { ...section, geometry } : section,
					),
				},
		);
		setSaveError(null);
	}

	async function save() {
		if (!map || !draft || !changed || saving || penMode) return;
		setSaving(true);
		setSaveError(null);
		try {
			const response = await fetch(url, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					revision: map.revision ?? null,
					sections: draft,
				}),
			});
			if (!response.ok) {
				const payload = await response.json().catch(() => null);
				setSaveError(payload?.error ?? "Neizdevās saglabāt sekciju robežas.");
				return;
			}
			const saved = (await response.json()) as SectionBoundaryMap;
			resourceCache.rememberSectionBoundaries(drawing.id, saved);
			setResult({ map: saved, failed: false });
			finishEditing();
		} catch {
			setSaveError("Neizdevās saglabāt sekciju robežas. Mēģiniet vēlreiz.");
		} finally {
			setSaving(false);
		}
	}

	function onDrawingClick(target: Element) {
		if (saving) return;
		const shape = target.closest("[data-boundary-polygon]");
		const section = sections.find(
			({ code }) => code === shape?.getAttribute("data-section-boundary"),
		);
		if (section && shape) {
			selectPolygon(
				section.code,
				Number(shape.getAttribute("data-boundary-polygon")),
			);
		} else if (!editing && chosen) {
			selectPolygon(chosen.code, null);
		}
	}

	function renderTools(page: number, ready: boolean) {
		if (!map || !chosen || map.page !== page || penMode) return null;
		return (
			<>
				<select
					aria-label="Sekcija"
					className={selectClass}
					value={chosen.code}
					disabled={saving || !ready}
					onChange={(event) => {
						const section = sections.find(
							({ code }) => code === event.target.value,
						);
						if (section) selectPolygon(section.code, null);
					}}
				>
					{sections.map(({ code }) => (
						<option key={code}>{code}</option>
					))}
				</select>
				{chosen.geometry.length ? (
					<select
						aria-label="Poligons"
						className={selectClass}
						value={polygonIndex ?? ""}
						disabled={saving || !ready}
						onChange={(event) =>
							selectPolygon(
								chosen.code,
								event.target.value === "" ? null : Number(event.target.value),
							)
						}
					>
						<option value="">Atlasīt poligonu</option>
						{chosen.geometry.map((part, index) => (
							<option key={JSON.stringify(part[0].slice(0, 2))} value={index}>
								Poligons {index + 1}
							</option>
						))}
					</select>
				) : null}
				{editing && polygon && polygon.length > 1 ? (
					<select
						aria-label="Kontūra"
						className={selectClass}
						value={ringIndex}
						disabled={saving}
						onChange={(event) =>
							setSelection(
								(current) =>
									current && { ...current, ring: Number(event.target.value) },
							)
						}
					>
						{polygon.map((part, index) => (
							<option key={JSON.stringify(part.slice(0, 2))} value={index}>
								{index ? `Izgriezums ${index}` : "Ārējā robeža"}
							</option>
						))}
					</select>
				) : null}
				{!editing ? (
					<>
						<Button
							size="sm"
							variant="outline"
							disabled={!ready}
							onClick={() => startDrawing("polygon")}
						>
							<Pencil className="h-3.5 w-3.5" /> Zīmēt zonu
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={!ready}
							onClick={() => startDrawing("freehand")}
						>
							Brīvrokas zona
						</Button>
						{polygon ? (
							<Button size="sm" variant="outline" onClick={startEditing}>
								<Pencil className="h-3.5 w-3.5" /> Pielāgot zonu
							</Button>
						) : null}
					</>
				) : (
					<Button
						size="sm"
						variant="outline"
						disabled={saving}
						onClick={() => startDrawing("polygon")}
					>
						<Plus className="h-3.5 w-3.5" /> Pievienot poligonu
					</Button>
				)}
				{polygon ? (
					<Button
						size="icon"
						variant="ghost"
						className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
						aria-label="Dzēst poligonu"
						disabled={saving}
						onClick={deletePolygon}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				) : null}
				{editing ? (
					<>
						<Button
							size="sm"
							onClick={() => void save()}
							disabled={!changed || saving}
						>
							{saving ? "Saglabā…" : "Saglabāt zonu"}
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={saving}
							onClick={cancelEditing}
						>
							Atcelt
						</Button>
					</>
				) : null}
			</>
		);
	}

	return (
		<section
			aria-label="Sekciju robežas"
			className="absolute inset-0 flex flex-col"
		>
			<div className="space-y-2 border-b bg-background px-3 py-2 text-xs">
				{map ? (
					<>
						<ul
							aria-label="Sekcijas"
							className="flex flex-wrap gap-x-4 gap-y-1"
						>
							{sections.map(({ code }) => {
								const { color, label } = sectionBoundaryStyles[code];
								return (
									<li key={code} className="flex items-center gap-2">
										<span
											aria-hidden="true"
											className="size-3 shrink-0 rounded-sm"
											style={{ background: color }}
										/>
										<strong>{code}</strong> {label}
									</li>
								);
							})}
						</ul>
						{saveError ? (
							<p role="alert" className="text-destructive">
								{saveError}
							</p>
						) : null}
						<p className="text-muted-foreground">
							Avots: {map.finishDrawing}
							{map.editedAt ? (
								<output> · Robežas manuāli labotas</output>
							) : null}
						</p>
						{map.unmappedRooms.length && !draft ? (
							<details className="text-muted-foreground">
								<summary className="cursor-pointer">
									Sākotnējā kartē neiekļautās telpas ({map.unmappedRooms.length}
									)
								</summary>
								<p>{map.unmappedRooms.join(", ")}</p>
							</details>
						) : null}
					</>
				) : (
					<output className="block text-muted-foreground">
						{!result
							? "Ielādē sekciju robežas…"
							: result.failed
								? "Neizdevās ielādēt sekciju robežas."
								: "Šai rasējuma versijai nav pārbaudītas sekciju kartes."}
					</output>
				)}
			</div>
			<div className="relative min-h-0 flex-1">
				<VisualPdf
					active={active}
					fillWorkspace
					url={`${endpoint}?pdf=1`}
					resourceCache={resourceCache}
					pageScales={drawing.state.pageScales}
					marks={emptyMarks}
					selected={null}
					onSelect={() => {}}
					drawingPageOverlay={!!penMode}
					pageOverlayControls={{
						selected: !!polygon,
						editing,
						onClick: onDrawingClick,
						render: renderTools,
					}}
					renderPageOverlay={(page, surface, viewport) =>
						map?.page === page ? (
							<>
								<svg
									aria-hidden="true"
									viewBox="0 0 1 1"
									preserveAspectRatio="none"
									className="pointer-events-none absolute inset-0 h-full w-full"
								>
									<title>Sekciju poligoni</title>
									{shapes.map(({ code, index, path }) => {
										const { color } = sectionBoundaryStyles[code];
										const selected =
											code === chosen?.code && index === polygonIndex;
										return (
											<path
												key={`${code}:${index}`}
												d={path}
												fill={color}
												fillOpacity={selected ? 0.5 : 0.24}
												fillRule="evenodd"
												stroke={selected ? "#0f172a" : color}
												strokeWidth={selected ? 3 : 1.5}
												vectorEffect="non-scaling-stroke"
												data-section-boundary={code}
												data-boundary-polygon={index}
												className={
													penMode
														? undefined
														: "pointer-events-auto cursor-pointer"
												}
											/>
										);
									})}
								</svg>
								{editing &&
								chosen &&
								polygon &&
								editedRing &&
								polygonIndex !== null &&
								!penMode ? (
									<>
										{ringIndex === 0 ? (
											<VisualPlanAreaTarget
												area={{
													id: `${chosen.code}:${polygonIndex}`,
													page,
													polygon: zoneRingPoints(polygon[0]),
												}}
												label="Pārvietot zonu"
												surface={surface.current}
												selected
												disabled={saving}
												onSelect={() => {}}
												onMove={(area) =>
													changeGeometry(
														chosen.code,
														translateZoneComponent(
															chosen.geometry,
															polygonIndex,
															area.polygon,
														),
													)
												}
											/>
										) : null}
										<VisualPolygonEditor
											key={`${chosen.code}:${polygonIndex}:${ringIndex}`}
											area={{
												id: `${chosen.code}:${polygonIndex}`,
												page,
												polygon: zoneRingPoints(editedRing),
											}}
											surface={surface}
											compact
											maxVertices={VISUAL_MAX_POLYGON_POINTS}
											disabled={saving}
											labelPrefix={
												ringIndex ? `Izgriezums ${ringIndex}` : undefined
											}
											onChange={(area) => {
												changeGeometry(
													chosen.code,
													replaceZoneRing(
														chosen.geometry,
														polygonIndex,
														ringIndex,
														area.polygon,
													),
												);
												return true;
											}}
										/>
									</>
								) : null}
								{chosen && penMode ? (
									<VisualAreaPen
										mode={penMode}
										surface={surface}
										viewport={viewport}
										color={sectionBoundaryStyles[chosen.code].color}
										onCancel={() =>
											changed ? setPenMode(null) : finishEditing()
										}
										onComplete={(points) => {
											const ring = points.map(({ x, y }): Pair => [x, y]);
											changeGeometry(chosen.code, [...chosen.geometry, [ring]]);
											selectPolygon(chosen.code, chosen.geometry.length);
											setPenMode(null);
										}}
									/>
								) : null}
							</>
						) : null
					}
				/>
			</div>
		</section>
	);
}
