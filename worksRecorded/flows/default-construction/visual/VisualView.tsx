"use client";

import {
	Loader2,
	PanelLeftClose,
	PanelLeftOpen,
	RefreshCw,
	Settings2,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DIARY_PHOTO_DELETED,
	type DiaryPhotoDeleted,
} from "@/lib/photos/photo-deleted-event";
import { useUploadThing } from "@/lib/utils/UploadthingsComponents";
import { DiaryRecordPhotos } from "../frontend/DiaryRecordPhotos";
import {
	deleteVisualDrawing,
	getVisualDrawings,
	refreshVisualDrawing,
	resolveVisualSourceReview,
	restartVisualDrawing,
	saveVisualPolygon,
} from "./actions";
import {
	normalizeVisualLocation,
	VISUAL_LEASE_MS,
	VISUAL_MAX_BYTES,
	type VisualDrawing,
	type VisualLayer,
	visualImageProgress,
	visualLayers,
	workLayer,
} from "./model";
import { pruneVisualEvidence } from "./prune-evidence";
import {
	buildVisualTimeline,
	cumulativeVisualMarks,
	sortVisualMarksChronologically,
	visualDiaryDay,
} from "./timeline";
import { useVisualAutoSync } from "./useVisualAutoSync";
import { useVisualWorkspace } from "./useVisualWorkspace";
import {
	type VisualAnalysisPhase,
	VisualAnalysisProgress,
} from "./VisualAnalysisProgress";
import { VisualPdf } from "./VisualPdf";
import { VisualSidebar } from "./VisualSidebar";
import { VisualTimeline } from "./VisualTimeline";
import { VisualZoneDetails } from "./VisualZoneDetails";

type Index = Awaited<ReturnType<typeof getVisualDrawings>>;
const allLayers = Object.keys(visualLayers) as VisualLayer[];

export default function VisualView({
	siteId,
	active = true,
}: {
	siteId: string;
	active?: boolean;
}) {
	const { workspace, height } = useVisualWorkspace(active);
	const [index, setIndex] = useState<Index | null>(null);
	const [location, setLocation] = useState("");
	const [drawing, setDrawing] = useState<VisualDrawing | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [editing, setEditing] = useState(false);
	const [workEditing, setWorkEditing] = useState(false);
	const [automatic, setAutomatic] = useState(false);
	const [syncedAt, setSyncedAt] = useState<number | null>(null);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const remoteActive =
		drawing?.state.status === "running" &&
		drawing.state.lockedAt !== null &&
		Date.now() - drawing.state.lockedAt < VISUAL_LEASE_MS;
	const controlsLocked = busy || editing || workEditing || remoteActive;
	const [confirmation, setConfirmation] = useState<
		"delete" | "restart" | "replace" | null
	>(null);
	const [deleting, setDeleting] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [progress, setProgress] = useState(0);
	const [phase, setPhase] = useState<VisualAnalysisPhase>("idle");
	const [progressUnavailable, setProgressUnavailable] = useState(false);
	const [throughDay, setThroughDay] = useState<number | null>(null);
	const [includeUndated, setIncludeUndated] = useState(false);
	const [layers, setLayers] = useState<VisualLayer[]>(allLayers);
	const [selected, setSelected] = useState<string | null>(null);
	const epoch = useRef(0);
	const busyRef = useRef(false);
	const requestId = useRef(0);
	const analysisVersion = useRef(0);
	const previousAttempt = useRef<string | undefined>(undefined);
	const fileId = useId();
	const { startUpload } = useUploadThing("limeniVisualDrawingUploader", {
		onUploadProgress: setProgress,
	});
	const endpoint = (id: string) =>
		`/api/sites/${encodeURIComponent(siteId)}/visual/${encodeURIComponent(id)}`;
	useEffect(() => {
		const run = ++epoch.current;
		void getVisualDrawings(siteId).then(
			(data) => {
				if (run === epoch.current) setIndex(data);
			},
			() => {
				if (run === epoch.current)
					setError("Neizdevās ielādēt lokācijas un rasējumus.");
			},
		);
		return () => {
			++epoch.current;
			++requestId.current;
		};
	}, [siteId]);
	const pollDrawingId = drawing?.id;
	useEffect(() => {
		function onPhotoDeleted(event: Event) {
			const detail = (event as CustomEvent<DiaryPhotoDeleted>).detail;
			if (detail.siteId !== siteId) return;
			const urls = new Set(detail.deletedUrls);
			const recordIds = new Set(detail.deletedRecordIds ?? []);
			setDrawing((previous) => {
				if (!previous) return previous;
				const state = pruneVisualEvidence(
					previous.state,
					(item) => !(urls.has(item.photoUrl) && recordIds.has(item.recordId)),
				);
				return state === previous.state ? previous : { ...previous, state };
			});
		}
		window.addEventListener(DIARY_PHOTO_DELETED, onPhotoDeleted);
		return () =>
			window.removeEventListener(DIARY_PHOTO_DELETED, onPhotoDeleted);
	}, [siteId]);
	const shouldPoll =
		active && (phase === "analyzing" || drawing?.state.status === "running");
	useEffect(() => {
		if (!shouldPoll || !pollDrawingId) return;
		const id = pollDrawingId;
		const controller = new AbortController();
		let timer: ReturnType<typeof setTimeout>;
		let lease = Date.now();
		async function poll() {
			const version = analysisVersion.current;
			const request = new AbortController();
			const abort = () => request.abort();
			controller.signal.addEventListener("abort", abort, { once: true });
			const timeout = setTimeout(abort, 10_000);
			try {
				const response = await fetch(
					`/api/sites/${encodeURIComponent(siteId)}/visual/${encodeURIComponent(id)}`,
					{
						cache: "no-store",
						signal: request.signal,
					},
				);
				if (!response.ok) throw new Error("Progress unavailable");
				const data = (await response.json()) as VisualDrawing;
				if (controller.signal.aborted || version !== analysisVersion.current)
					return;
				setProgressUnavailable(false);
				const newAttempt =
					data.state.attempts.at(-1)?.id !== previousAttempt.current;
				if (!busyRef.current || newAttempt) {
					lease = data.state.lockedAt ?? lease;
					if (
						data.state.status === "running" &&
						Date.now() - lease >= VISUAL_LEASE_MS
					) {
						data.state.status = "failed";
						data.state.lockedAt = null;
						data.state.error =
							"Analīze pārtraukta. Saglabātie rezultāti ir pieejami; turpiniet nepabeigto attēlu analīzi.";
					}
					setDrawing(data);
				}
			} catch {
				if (!controller.signal.aborted) setProgressUnavailable(true);
			} finally {
				clearTimeout(timeout);
				controller.signal.removeEventListener("abort", abort);
				if (!controller.signal.aborted) timer = setTimeout(poll, 1500);
			}
		}
		timer = setTimeout(poll, 1000);
		return () => {
			controller.abort();
			clearTimeout(timer);
		};
	}, [siteId, pollDrawingId, shouldPoll]);
	async function loadDrawing(id: string) {
		const request = ++requestId.current;
		setDrawing(null);
		setLoading(true);
		setSelected(null);
		setThroughDay(null);
		setIncludeUndated(false);
		setError(null);
		setNotice(null);
		try {
			const response = await fetch(endpoint(id), { cache: "no-store" });
			const data = await response.json();
			if (!response.ok) throw new Error(data.error);
			if (request === requestId.current) {
				setDrawing(data);
				setLocation(data.state.location);
				return data as VisualDrawing;
			}
		} catch {
			if (request === requestId.current)
				setError("Neizdevās ielādēt rasējumu.");
		} finally {
			if (request === requestId.current) setLoading(false);
		}
		return null;
	}
	function selectLocation(value: string) {
		++requestId.current;
		setLocation(value);
		setDrawing(null);
		setSelected(null);
		setFile(null);
		setError(null);
		setNotice(null);
		setLoading(false);
		const assigned = index?.drawings.find(
			(item) =>
				normalizeVisualLocation(item.location) ===
				normalizeVisualLocation(value),
		);
		if (assigned) void loadDrawing(assigned.id);
	}
	async function analyze(id: string, run: number) {
		++analysisVersion.current;
		try {
			const response = await fetch(endpoint(id), { method: "POST" });
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Analīze neizdevās.");
			if (run !== epoch.current) return;
			const result = data as VisualDrawing;
			++analysisVersion.current;
			setDrawing(result);
		} finally {
			++analysisVersion.current;
		}
	}
	async function process(
		mode: "upload" | "resume" | "refresh" | "restart",
		auto = false,
	) {
		if (busyRef.current || editing || workEditing || remoteActive) return;
		const run = epoch.current;
		busyRef.current = true;
		setBusy(true);
		setAutomatic(auto);
		setError(null);
		setNotice(null);
		setProgress(0);
		setPhase(mode === "upload" ? "upload" : "preparing");
		try {
			let id = drawing?.id;
			let loaded: VisualDrawing | null = null;
			if (mode === "upload") {
				if (!file || !location) throw new Error("Izvēlieties lokāciju un PDF.");
				if (file.type !== "application/pdf" || file.size > VISUAL_MAX_BYTES)
					throw new Error(
						"Izvēlieties PDF līdz 16 MB (ne vairāk kā 10 lapas).",
					);
				const files = await startUpload([file], {
					siteId,
					location,
					...(locationDrawings[0]
						? { replaceDrawingId: locationDrawings[0].id }
						: {}),
				});
				id = files?.[0]?.serverData?.drawingId;
			} else if (mode === "refresh" && id) {
				const result = await refreshVisualDrawing(siteId, id);
				if (run !== epoch.current) return;
				loaded = result.drawing;
				setDrawing(loaded);
				setSyncedAt(Date.now());
				if (
					!auto ||
					result.addedCount ||
					result.updatedCount ||
					result.removedCount
				)
					setNotice(
						result.addedCount || result.updatedCount || result.removedCount
							? `Pievienoti ${result.addedCount} jauni attēli. Atjaunināti ${result.updatedCount || 0} mainīto ierakstu attēli. Noņemti ${result.removedCount} dzēsto vai pārvietoto avotu attēli. Nemainīto ierakstu zonas un labojumi ir saglabāti.`
							: "Šai lokācijai nav jaunu vai mainītu žurnāla attēlu. Esošie rezultāti nav mainīti.",
					);
				if (!(result.analysisCount ?? result.addedCount + result.updatedCount))
					return;
			} else if (mode === "restart" && id)
				await restartVisualDrawing(siteId, id);
			if (!id) throw new Error("PDF augšupielāde neizdevās.");
			if (run !== epoch.current) return;
			setPhase("preparing");
			loaded ??= mode === "resume" ? drawing : await loadDrawing(id);
			if (!loaded || run !== epoch.current) return;
			previousAttempt.current = loaded.state.attempts.at(-1)?.id;
			setProgressUnavailable(false);
			setPhase("analyzing");
			await analyze(id, run);
			if (run !== epoch.current) return;
			setPhase("idle");
			const data = await getVisualDrawings(siteId);
			if (run === epoch.current) setIndex(data);
		} catch (issue) {
			if (run === epoch.current)
				setError(issue instanceof Error ? issue.message : "Analīze neizdevās.");
		} finally {
			busyRef.current = false;
			if (run === epoch.current) {
				setBusy(false);
				setPhase("idle");
				setAutomatic(false);
			}
		}
	}
	useVisualAutoSync({
		active,
		scope: drawing ? `${siteId}:${drawing.id}` : null,
		blocked: controlsLocked || loading || !!confirmation,
		sync: () => process("refresh", true),
	});
	async function resolveReview(reanalyze: boolean) {
		if (!drawing || !source || controlsLocked || busyRef.current) return;
		const run = epoch.current;
		busyRef.current = true;
		setBusy(true);
		setError(null);
		try {
			const updated = await resolveVisualSourceReview(
				siteId,
				drawing.id,
				source.id,
				reanalyze,
			);
			if (run !== epoch.current) return;
			setDrawing(updated);
			if (reanalyze) {
				previousAttempt.current = updated.state.attempts.at(-1)?.id;
				setPhase("analyzing");
				await analyze(drawing.id, run);
			}
		} catch (issue) {
			if (run === epoch.current)
				setError(
					issue instanceof Error ? issue.message : "Neizdevās pārskatīt avotu.",
				);
		} finally {
			busyRef.current = false;
			if (run === epoch.current) {
				setBusy(false);
				setPhase("idle");
			}
		}
	}
	async function removeDrawing() {
		if (!drawing || busyRef.current) return;
		const id = drawing.id;
		const run = epoch.current;
		busyRef.current = true;
		setBusy(true);
		setDeleting(true);
		setError(null);
		try {
			await deleteVisualDrawing(siteId, id);
			if (run !== epoch.current) return;
			++requestId.current;
			setDrawing(null);
			setSelected(null);
			setIndex((previous) =>
				previous
					? {
							...previous,
							drawings: previous.drawings.filter((item) => item.id !== id),
						}
					: previous,
			);
		} catch {
			if (run === epoch.current)
				setError(
					"Neizdevās dzēst rasējumu. Ja analīze vēl notiek, uzgaidiet un mēģiniet vēlreiz.",
				);
		} finally {
			busyRef.current = false;
			if (run === epoch.current) {
				setBusy(false);
				setDeleting(false);
			}
		}
	}
	const locationDrawings =
		index?.drawings.filter(
			(item) =>
				normalizeVisualLocation(item.location) ===
				normalizeVisualLocation(location),
		) ?? [];
	const timeline = useMemo(
		() =>
			buildVisualTimeline(
				drawing?.state.evidence ?? [],
				drawing?.latestDiaryDate,
			),
		[drawing?.state.evidence, drawing?.latestDiaryDate],
	);
	const selectedDay =
		timeline.firstDay !== null && timeline.lastDay !== null
			? Math.max(
					timeline.firstDay,
					Math.min(throughDay ?? timeline.lastDay, timeline.lastDay),
				)
			: null;
	const datedMarks = cumulativeVisualMarks(
		drawing?.state.marks ?? [],
		timeline.dayByEvidence,
		selectedDay,
		includeUndated || selectedDay === null,
	);
	const visibleMarks = sortVisualMarksChronologically(
		datedMarks.filter((mark) => layers.includes(mark.layer)),
		drawing?.state.evidence ?? [],
	);
	const undatedCount =
		drawing?.state.marks.filter(
			(mark) => timeline.dayByEvidence.get(mark.evidenceId) == null,
		).length ?? 0;
	const selectedMark = visibleMarks.find((mark) => mark.id === selected);
	const source = drawing?.state.evidence.find(
		(item) => item.id === selectedMark?.evidenceId,
	);
	function selectZone(id: string | null) {
		if (editing || workEditing) return;
		setSelected(id);
	}
	const reviewedSources =
		drawing?.state.evidence.filter((item) => item.reviewRequired) ?? [];
	const completedImages = drawing
		? visualImageProgress(drawing.state).filter(
				(item) => item.status === "complete",
			).length
		: 0;
	const sourceProgress =
		source && drawing
			? visualImageProgress(drawing.state).find(
					(item) => item.evidenceId === source.id,
				)
			: null;

	return (
		<section
			ref={workspace}
			data-testid="visual-workspace"
			aria-label="Izpildshēmu darba telpa"
			className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-background"
			style={{ height: height ?? "calc(100dvh - 240px)" }}
		>
			<header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 shrink-0"
					disabled={!drawing}
					aria-expanded={sidebarOpen}
					aria-controls={`${fileId}-sidebar`}
					aria-label={
						sidebarOpen ? "Paslēpt slāņus un avotus" : "Rādīt slāņus un avotus"
					}
					title={
						sidebarOpen ? "Paslēpt slāņus un avotus" : "Rādīt slāņus un avotus"
					}
					onClick={() => setSidebarOpen((value) => !value)}
				>
					{sidebarOpen ? (
						<PanelLeftClose className="h-4 w-4" />
					) : (
						<PanelLeftOpen className="h-4 w-4" />
					)}
				</Button>
				<h3 className="hidden shrink-0 text-sm font-semibold xl:block">
					Izpildshēmas
				</h3>
				<Select
					value={location}
					disabled={controlsLocked || !index}
					onValueChange={selectLocation}
				>
					<SelectTrigger className="h-8 w-36 shrink-0" aria-label="Lokācija">
						<SelectValue placeholder="Lokācija" />
					</SelectTrigger>
					<SelectContent>
						{index?.locations.map((item) => (
							<SelectItem key={item} value={item}>
								{item}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<span
					className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
					title={drawing?.name}
				>
					{drawing?.name || locationDrawings[0]?.name}
				</span>
				{drawing ? (
					<>
						<output
							className="hidden shrink-0 text-xs text-muted-foreground lg:block"
							aria-live="polite"
						>
							{automatic ? (
								<span className="flex items-center gap-2">
									<Loader2 className="h-3 w-3 animate-spin" />
									{phase === "analyzing"
										? `Atjaunina zonas… ${completedImages}/${drawing.state.evidence.length}`
										: "Pārbauda izmaiņas…"}
								</span>
							) : (
								`Automātiska atjaunošana ieslēgta${syncedAt ? ` · Pārbaudīts ${new Date(syncedAt).toLocaleTimeString("lv", { hour: "2-digit", minute: "2-digit" })}` : ""}`
							)}
						</output>
						{!["complete", "unlocated"].includes(drawing.state.status) ? (
							<Button
								size="sm"
								variant="outline"
								disabled={controlsLocked}
								onClick={() => void process("resume")}
							>
								Turpināt analīzi
							</Button>
						) : null}
						<Button
							size="sm"
							className="shrink-0"
							aria-label="Atjaunot no žurnāla"
							title="Atjaunot no žurnāla"
							variant="outline"
							disabled={controlsLocked}
							onClick={() => void process("refresh")}
						>
							<RefreshCw className="h-4 w-4" />
							<span className="hidden sm:inline">Atjaunot no žurnāla</span>
						</Button>
					</>
				) : null}
				<Popover>
					<PopoverTrigger asChild>
						<Button
							size="icon"
							variant="ghost"
							className="h-8 w-8 shrink-0"
							aria-label="Rasējuma iestatījumi"
							title="Rasējuma iestatījumi"
						>
							<Settings2 className="h-4 w-4" />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						align="end"
						className="w-[min(480px,calc(100vw-2rem))] max-h-[70dvh] space-y-4 overflow-y-auto"
					>
						<h4 className="text-sm font-semibold">Rasējuma iestatījumi</h4>
						<p className="text-xs text-muted-foreground">
							PDF rasējums jāpievieno tikai vienreiz; to var aizstāt, ja
							nepieciešams.
						</p>
						<details
							open={!locationDrawings.length && !drawing}
							className="rounded-lg border bg-muted/20 px-3 py-2"
						>
							<summary className="cursor-pointer text-sm font-medium">
								{drawing || locationDrawings.length
									? "Aizstāt PDF rasējumu"
									: "Augšupielādēt PDF rasējumu"}
							</summary>
							<div className="mt-3 flex flex-wrap items-end gap-3 pb-1">
								<div className="min-w-0 flex-1 space-y-2">
									<Label htmlFor={fileId}>
										Jauns PDF rasējums (līdz 16 MB, 10 lapām)
									</Label>
									<Input
										key={location}
										id={fileId}
										type="file"
										accept="application/pdf,.pdf"
										disabled={controlsLocked || loading || !location}
										onChange={(event) =>
											setFile(event.target.files?.[0] ?? null)
										}
									/>
								</div>
								<Button
									disabled={controlsLocked || loading || !file || !location}
									onClick={() =>
										locationDrawings.length
											? setConfirmation("replace")
											: void process("upload")
									}
								>
									Augšupielādēt un analizēt
								</Button>
							</div>
						</details>

						{drawing ? (
							<>
								<div className="flex flex-wrap gap-2">
									<Button
										variant="outline"
										disabled={controlsLocked || loading}
										onClick={() => setConfirmation("restart")}
									>
										Sākt analīzi no jauna
									</Button>
									<Button
										variant="destructive"
										disabled={controlsLocked || loading}
										onClick={() => setConfirmation("delete")}
									>
										Dzēst rasējumu
									</Button>
								</div>
								<details className="text-xs text-muted-foreground">
									<summary className="cursor-pointer">
										AI aptuvenās zonas — pārbaudiet pirms izmantošanas
									</summary>
									<p className="mt-2 max-w-4xl leading-relaxed">
										AI aptuvenās zonas — arī pēc svītrām un nepilnīgām atzīmēm.
										Robežas var būt interpretētas; pirms izmantošanas pārbaudiet
										avota attēlus. Tas nav precīzs uzmērījums vai apstiprināts
										darbu apjoms. Slāņi var pārklāties. Kamēr šis skats ir
										atvērts, jauni un mainīti ieraksti tiek atjaunoti
										automātiski.
									</p>
								</details>

								{drawing.state.unlocated.length ? (
									<details className="rounded-md border p-3">
										<summary className="cursor-pointer text-sm font-medium">
											Neizdevās izvietot: {drawing.state.unlocated.length}{" "}
											attēli
										</summary>
										<ul className="mt-3 space-y-3">
											{drawing.state.unlocated.map((issue) => {
												const item = drawing.state.evidence.find(
													(entry) => entry.id === issue.evidenceId,
												);
												return (
													<li
														key={issue.evidenceId}
														className="flex flex-wrap gap-3 border-t pt-3 text-sm"
													>
														<DiaryRecordPhotos
															photos={item ? [item.photoUrl] : []}
															language="lv"
														/>
														<div className="min-w-0 flex-1">
															<p className="font-medium">{item?.work}</p>
															<p>{issue.reason}</p>
														</div>
													</li>
												);
											})}
										</ul>
									</details>
								) : null}
							</>
						) : null}
					</PopoverContent>
				</Popover>
			</header>
			<div
				className="relative min-h-0 flex-1 overflow-hidden"
				data-testid="visual-canvas-workspace"
			>
				{drawing ? (
					<>
						<VisualPdf
							key={drawing.id}
							fillWorkspace
							url={`${endpoint(drawing.id)}?pdf=1`}
							marks={visibleMarks}
							selected={selectedMark?.id ?? null}
							onSelect={selectZone}
							editable={
								!busy && !workEditing && drawing.state.status !== "running"
							}
							onEditingChange={setEditing}
							onSave={async (edit) => {
								const updated = await saveVisualPolygon(
									siteId,
									drawing.id,
									edit,
								);
								setDrawing(updated);
							}}
						/>
						<VisualZoneDetails
							siteId={siteId}
							drawingId={drawing.id}
							source={source}
							mark={selectedMark}
							progressPending={
								!!sourceProgress && sourceProgress.status !== "complete"
							}
							editorLocked={busy || editing || remoteActive}
							closeLocked={editing || workEditing}
							controlsLocked={controlsLocked}
							onClose={() => selectZone(null)}
							onEditingChange={setWorkEditing}
							onResolveReview={resolveReview}
							onSaved={(updated) => {
								if (!source) return;
								setDrawing(updated);
								setLayers((values) => [
									...new Set([
										...values,
										workLayer(
											updated.state.evidence.find(
												(item) => item.id === source.id,
											)?.work ?? source.work,
										),
									]),
								]);
								setNotice(
									updated.assignmentWarning ??
										"Darba tips saglabāts žurnālā un visās ieraksta zonās.",
								);
							}}
						/>

						<VisualSidebar
							id={`${fileId}-sidebar`}
							open={sidebarOpen}
							marks={visibleMarks}
							datedMarks={datedMarks}
							evidence={drawing.state.evidence}
							dayByEvidence={timeline.dayByEvidence}
							layers={layers}
							onLayers={setLayers}
							selected={selected}
							onSelect={selectZone}
							locked={editing || workEditing}
						/>
					</>
				) : (
					<div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
						<h3 className="text-lg font-medium">
							{location ? "Lokācijai vēl nav rasējuma" : "Izvēlieties lokāciju"}
						</h3>
						<p className="max-w-md text-sm text-muted-foreground">
							{index && !index.locations.length
								? "Vispirms norādiet lokāciju būvdarbu žurnāla ierakstos un pievienojiet tai darbu attēlus."
								: "Izvēlieties lokāciju un rasējuma iestatījumos pievienojiet PDF."}
						</p>
					</div>
				)}
				{!index || loading || deleting ? (
					<output className="absolute inset-0 z-40 flex items-center justify-center gap-2 bg-background/80 text-sm">
						<Loader2 className="h-5 w-5 animate-spin" />
						{deleting ? "Dzēš rasējumu…" : "Ielādē…"}
					</output>
				) : null}
				{(!automatic &&
					(busy ||
						(drawing &&
							!["complete", "unlocated"].includes(drawing.state.status)))) ||
				error ||
				drawing?.state.error ||
				reviewedSources.length ? (
					<div className="absolute bottom-14 left-3 right-16 z-40 max-h-[calc(100%-8rem)] max-w-xl space-y-2 overflow-y-auto rounded-lg border bg-background/95 p-3 shadow-lg">
						{!automatic ? (
							<VisualAnalysisProgress
								phase={phase}
								drawing={drawing}
								uploadProgress={progress}
								interrupted={!!error}
								progressUnavailable={progressUnavailable}
							/>
						) : null}
						{error || drawing?.state.error ? (
							<p role="alert" className="text-xs text-destructive">
								{error || drawing?.state.error}
							</p>
						) : null}
						{error && !drawing && locationDrawings[0] ? (
							<Button
								size="sm"
								variant="outline"
								disabled={loading || controlsLocked}
								onClick={() => void loadDrawing(locationDrawings[0].id)}
							>
								Mēģināt vēlreiz
							</Button>
						) : null}
						{reviewedSources.length ? (
							<p className="text-xs">
								Žurnālā mainīti {reviewedSources.length} manuāli pielāgotu zonu
								avoti. Zonas saglabātas; izvēlieties avotu un pārskatiet
								izmaiņas.
							</p>
						) : null}
					</div>
				) : null}
				{notice ? (
					<output className="pointer-events-none absolute bottom-3 left-1/2 z-40 max-w-[90%] -translate-x-1/2 rounded-md border bg-background/95 px-3 py-2 text-xs shadow-sm">
						{notice}
					</output>
				) : null}
				{automatic ? (
					<output
						className="pointer-events-none absolute bottom-3 left-3 z-40 flex items-center gap-2 rounded-md border bg-background/95 px-3 py-2 text-xs shadow-sm lg:hidden"
						aria-live="polite"
					>
						<Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />
						{phase === "analyzing" && drawing
							? `Atjaunina zonas… ${completedImages}/${drawing.state.evidence.length}`
							: "Pārbauda izmaiņas…"}
					</output>
				) : null}
			</div>
			{drawing ? (
				<fieldset disabled={editing || workEditing} className="min-w-0">
					<VisualTimeline
						compact
						firstDay={timeline.firstDay}
						lastDay={timeline.lastDay}
						day={selectedDay}
						onChange={(day) => {
							if (!editing) {
								setThroughDay(day);
								setSelected(null);
							}
						}}
						undatedCount={undatedCount}
						includeUndated={includeUndated}
						onIncludeUndated={(value) => {
							if (!editing) setIncludeUndated(value);
						}}
						visibleCount={visibleMarks.length}
					/>
				</fieldset>
			) : null}
			<AlertDialog
				open={confirmation !== null}
				onOpenChange={(open) => {
					if (!open) setConfirmation(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{confirmation === "delete"
								? "Dzēst rasējumu?"
								: confirmation === "replace"
									? "Aizstāt lokācijas rasējumu?"
									: "Sākt analīzi no jauna?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{confirmation === "delete"
								? `Rasējums “${drawing?.name}” un tā analīzes rezultāti tiks neatgriezeniski noņemti no izpildshēmu skata. Žurnāla ieraksti, fotoattēli un citi rasējumi netiks mainīti.`
								: confirmation === "replace"
									? "Katrai lokācijai ir viens aktīvs rasējums. Iepriekšējais rasējums un tā zonas tiks arhivēti; jaunais PDF tiks analizēts no jauna."
									: "Esošās zonas un manuālie labojumi tiks aizstāti ar jaunu analīzi, izmantojot to pašu PDF un saglabātos avota attēlus. Lai iekļautu tikai jaunus žurnāla attēlus un saglabātu esošās zonas, izmantojiet “Atjaunot no žurnāla”."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Atcelt</AlertDialogCancel>
						<AlertDialogAction
							disabled={busy}
							onClick={() => {
								if (confirmation === "delete") void removeDrawing();
								else if (confirmation === "replace") void process("upload");
								else void process("restart");
							}}
						>
							{confirmation === "delete"
								? "Jā, dzēst"
								: confirmation === "replace"
									? "Jā, aizstāt"
									: "Jā, sākt no jauna"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}
