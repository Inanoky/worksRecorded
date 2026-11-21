"use client";

import type { Pair } from "polygon-clipping";
import { useEffect, useState } from "react";
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
import { VisualAreaPen } from "./VisualAreaPen";
import { VisualPdf } from "./VisualPdf";
import { VisualPolygonEditor } from "./VisualPolygonEditor";
import type { VisualClientCache } from "./visual-client-cache";
import {
	replaceZoneRing,
	zoneGeometryPath,
	zoneRingPoints,
} from "./zone-geometry";

const emptyMarks: VisualMark[] = [];
const selectClass = "h-8 rounded-md border bg-background px-2 text-xs";
type MapResult = { map: SectionBoundaryMap | null; failed: boolean };
type Selection = {
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
	const [adding, setAdding] = useState(false);
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
	const sections = draft ?? map?.sections ?? [];
	const chosen = sections.find(({ code }) => code === selection?.code);
	const polygonIndex = selection?.polygon ?? null;
	const ringIndex = selection?.ring ?? 0;
	const polygon =
		polygonIndex === null ? undefined : chosen?.geometry[polygonIndex];
	const editedRing = polygon?.[ringIndex];
	const changed = !!draft && draft !== map?.sections;

	function selectPolygon(code: SectionBoundaryCode, polygon: number | null) {
		setSelection({ code, polygon, ring: 0 });
	}

	function finishEditing() {
		setEdit(null);
		setSelection(null);
		setAdding(false);
		setSaveError(null);
		onEditingChange(false);
	}

	function cancelEditing() {
		void resourceCache
			.loadSectionBoundaries(drawing.id, { force: true })
			.catch(() => {});
		finishEditing();
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
		if (!map || !draft || !changed || saving || adding) return;
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

	return (
		<section
			aria-label="Sekciju robežas"
			className="absolute inset-0 flex flex-col"
		>
			<div className="space-y-2 border-b bg-background px-3 py-2 text-xs">
				{map ? (
					<>
						<div className="flex flex-wrap items-center justify-between gap-2">
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
							{draft ? (
								<div className="flex flex-wrap items-center gap-2">
									<Button
										size="sm"
										onClick={() => void save()}
										disabled={!changed || saving || adding}
									>
										{saving ? "Saglabā…" : "Saglabāt robežas"}
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={saving}
										onClick={cancelEditing}
									>
										Atcelt labojumus
									</Button>
								</div>
							) : (
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										setEdit({ base: map, sections: map.sections });
										selectPolygon(map.sections[0].code, null);
										onEditingChange(true);
									}}
								>
									Pielāgot robežas
								</Button>
							)}
						</div>
						{draft && chosen ? (
							<div className="flex flex-wrap items-center gap-2">
								<select
									aria-label="Sekcija"
									className={selectClass}
									value={chosen.code}
									disabled={saving || adding}
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
								<select
									aria-label="Poligons"
									className={selectClass}
									value={polygonIndex ?? ""}
									disabled={saving || adding}
									onChange={(event) =>
										selectPolygon(
											chosen.code,
											event.target.value === ""
												? null
												: Number(event.target.value),
										)
									}
								>
									<option value="">Atlasīt poligonu</option>
									{chosen.geometry.map((part, index) => (
										<option
											key={JSON.stringify(part[0].slice(0, 2))}
											value={index}
										>
											Poligons {index + 1}
										</option>
									))}
								</select>
								{polygon && polygon.length > 1 ? (
									<select
										aria-label="Kontūra"
										className={selectClass}
										value={ringIndex}
										disabled={saving || adding}
										onChange={(event) =>
											setSelection(
												(current) =>
													current && {
														...current,
														ring: Number(event.target.value),
													},
											)
										}
									>
										{polygon.map((part, index) => (
											<option
												key={JSON.stringify(part.slice(0, 2))}
												value={index}
											>
												{index ? `Izgriezums ${index}` : "Ārējā robeža"}
											</option>
										))}
									</select>
								) : null}
								<Button
									size="sm"
									variant="outline"
									disabled={saving || adding}
									onClick={() => setAdding(true)}
								>
									Pievienot poligonu
								</Button>
								{polygonIndex !== null ? (
									<Button
										size="sm"
										variant="ghost"
										className="text-destructive"
										disabled={saving || adding}
										onClick={() => {
											changeGeometry(
												chosen.code,
												chosen.geometry.filter(
													(_, index) => index !== polygonIndex,
												),
											);
											selectPolygon(chosen.code, null);
										}}
									>
										Dzēst poligonu
									</Button>
								) : null}
								<p className="text-muted-foreground">
									{adding
										? "Klikšķiniet, lai iezīmētu poligona stūrus."
										: polygon
											? "Tuviniet rasējumu un velciet stūrus. Ar + pievienojiet stūri, ar Delete noņemiet."
											: "Izvēlieties poligonu rasējumā vai sarakstā."}
								</p>
							</div>
						) : null}
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
					drawingPageOverlay={adding}
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
									{sections.flatMap(({ code, geometry }) =>
										(draft
											? geometry.map((polygon) => [polygon])
											: [geometry]
										).map((polygons, index) => {
											const { color } = sectionBoundaryStyles[code];
											const selected =
												code === chosen?.code && index === polygonIndex;
											const key = draft
												? `${code}:${JSON.stringify(polygons[0][0].slice(0, 2))}`
												: code;
											const path = (
												<path
													key={key}
													d={zoneGeometryPath(polygons)}
													fill={color}
													fillOpacity={selected ? 0.4 : 0.24}
													fillRule="evenodd"
													stroke={selected ? "#0f172a" : color}
													strokeWidth={selected ? 3 : 1.5}
													vectorEffect="non-scaling-stroke"
													data-section-boundary={code}
												/>
											);
											if (!draft || adding || saving) return path;
											return (
												<g
													key={key}
													data-drawing-control
													className="pointer-events-auto cursor-pointer"
													onPointerUp={(event) => {
														if (event.button === 0 && !event.shiftKey)
															selectPolygon(code, index);
													}}
												>
													{path}
												</g>
											);
										}),
									)}
								</svg>
								{chosen && editedRing && polygonIndex !== null && !adding ? (
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
								) : null}
								{chosen && adding ? (
									<VisualAreaPen
										mode="polygon"
										surface={surface}
										viewport={viewport}
										color={sectionBoundaryStyles[chosen.code].color}
										onCancel={() => setAdding(false)}
										onComplete={(points) => {
											const ring = points.map(({ x, y }): Pair => [x, y]);
											changeGeometry(chosen.code, [...chosen.geometry, [ring]]);
											selectPolygon(chosen.code, chosen.geometry.length);
											setAdding(false);
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
