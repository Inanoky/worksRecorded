"use client";

import {
	CalendarRange,
	ClipboardCheck,
	Loader2,
	PanelLeftClose,
	PanelLeftOpen,
	Play,
	RefreshCw,
	Settings2,
	X,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { useProjectPreparationReporter } from "@/components/providers/ProjectLoadingProgressProvider";
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
import { useLimeniProjectData } from "../frontend/LimeniProjectData";
import { normalizeDiaryPhotoUrls } from "../lib/diary-photos";
import { sectionMappingOriginalPhotos } from "../lib/section-mapping-source";
import {
	deleteVisualDrawing,
	deleteVisualPolygon,
	getVisualDrawings,
	getVisualPlanning,
	refreshVisualDrawing,
	resolveVisualSourceReview,
	restartVisualDrawing,
	saveVisualLayers,
} from "./actions";
import {
	defaultVisualLayerSettings,
	projectVisualMarks,
	resolveVisualWorkLayer,
	type VisualLayerConfiguration,
	type VisualLayerSettings,
	visualLayerStyles,
} from "./layer-settings";
import {
	normalizeVisualLocation,
	VISUAL_LEASE_MS,
	VISUAL_MAX_BYTES,
	type VisualDrawing,
	type VisualLayer,
	visualImageProgress,
	visualLayers,
} from "./model";
import type { VisualPlanArea } from "./planning-model";
import type { PolygonDelete, PolygonSaveResult } from "./polygon-edit";
import { applyPolygonSave, projectPolygonSaves } from "./polygon-save-queue";
import { pruneVisualEvidence } from "./prune-evidence";
import type { VisualRecordChoice } from "./record-model";
import {
	buildVisualTimeline,
	cumulativeVisualMarks,
	sortVisualMarksChronologically,
	visualDiaryDay,
} from "./timeline";
import { usePlanningSaveQueue } from "./usePlanningSaveQueue";
import { usePolygonSaveQueue } from "./usePolygonSaveQueue";
import { useVisualAutoSync } from "./useVisualAutoSync";
import { useVisualWorkspace } from "./useVisualWorkspace";
import {
	type VisualAnalysisPhase,
	VisualAnalysisProgress,
} from "./VisualAnalysisProgress";
import { VisualFeedbackPanel } from "./VisualFeedbackPanel";
import { VisualLayerManager } from "./VisualLayerManager";
import { VisualPdf, type VisualPlanAreaSelection } from "./VisualPdf";
import { VisualPlanningPanel } from "./VisualPlanningPanel";
import { VisualPlanningSaveStatus } from "./VisualPlanningSaveStatus";
import { VisualPolygonSaveStatus } from "./VisualPolygonSaveStatus";
import { VisualRecordForm } from "./VisualRecordForm";
import { VisualSidebar } from "./VisualSidebar";
import { VisualTimeline } from "./VisualTimeline";
import { VisualZoneDetails } from "./VisualZoneDetails";
import {
	VISUAL_PLANNING_CACHE_INVALIDATED,
	VisualClientCache,
} from "./visual-client-cache";
import { fetchVisualIndex, fetchVisualPlanning } from "./visual-read-client";

type Index = Awaited<ReturnType<typeof getVisualDrawings>>;
function firstAssignedDrawing(index: Index) {
	for (const location of index.locations) {
		const drawing = index.drawings.find(
			(item) =>
				normalizeVisualLocation(item.location) ===
				normalizeVisualLocation(location),
		);
		if (drawing) return drawing;
	}
	return index.drawings[0];
}
const allLayers = Object.keys(visualLayers) as VisualLayer[];
const defaultLayerConfiguration: VisualLayerConfiguration = {
	settings: defaultVisualLayerSettings(),
	workOptions: [],
	positionIds: {},
};

export default function VisualView({
	siteId,
	active = true,
	preload = false,
}: {
	siteId: string;
	active?: boolean;
	preload?: boolean;
}) {
	const reportPreparation = useProjectPreparationReporter(siteId);
	const projectData = useLimeniProjectData();
	const initialProject = useRef(projectData.snapshot);
	if (!initialProject.current && projectData.snapshot)
		initialProject.current = projectData.snapshot;
	const projectReady = !projectData.enabled || !!projectData.snapshot;
	const appliedProjectVersion = useRef("");
	useEffect(() => {
		reportPreparation("visual-module");
	}, [reportPreparation]);
	const { workspace, height } = useVisualWorkspace(active);
	const resourceCache = useMemo(() => new VisualClientCache(siteId), [siteId]);
	const [index, setIndex] = useState<Index | null>(null);
	const [location, setLocation] = useState("");
	const [drawing, setDrawing] = useState<VisualDrawing | null>(null);
	const { queue: planningSaves, state: planningSaveState } =
		usePlanningSaveQueue(resourceCache, siteId, index?.userId);
	const currentCache = useRef(resourceCache);
	currentCache.current = resourceCache;
	const confirmPolygonSave = useCallback(
		(result: PolygonSaveResult) => {
			if (currentCache.current !== resourceCache) return;
			const cached = resourceCache.peekDrawing(result.drawingId);
			if (cached)
				resourceCache.rememberDrawing(applyPolygonSave(cached, result));
			setDrawing((value) => (value ? applyPolygonSave(value, result) : value));
		},
		[resourceCache],
	);
	const { queue: polygonSaves, state: polygonSaveState } = usePolygonSaveQueue(
		siteId,
		index?.userId,
		confirmPolygonSave,
	);
	const hasUnsavedPolygons = polygonSaveState.items.length > 0;
	const optimisticDrawing = useMemo(
		() => projectPolygonSaves(drawing, polygonSaveState.items),
		[drawing, polygonSaveState.items],
	);
	const [file, setFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [editing, setEditing] = useState(false);
	const [workEditing, setWorkEditing] = useState(false);
	const [recordDraft, setRecordDraft] = useState<{
		id: string;
		areas: VisualPlanArea[];
	} | null>(null);
	const [recordArea, setRecordArea] = useState<VisualPlanAreaSelection | null>(
		null,
	);
	const [recordSaving, setRecordSaving] = useState(false);
	const [automatic, setAutomatic] = useState(false);
	const [syncedAt, setSyncedAt] = useState<number | null>(null);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [mode, setMode] = useState<"actual" | "planning">("actual");
	const [planningDirty, setPlanningDirty] = useState(false);
	const [managingLayers, setManagingLayers] = useState(false);
	const [savingLayers, setSavingLayers] = useState(false);
	const layerConfiguration =
		index?.layerConfiguration ?? defaultLayerConfiguration;
	const layerStyles = useMemo(
		() => visualLayerStyles(layerConfiguration.settings),
		[layerConfiguration.settings],
	);
	const remoteActive =
		drawing?.state.status === "running" &&
		drawing.state.lockedAt !== null &&
		Date.now() - drawing.state.lockedAt < VISUAL_LEASE_MS;
	const controlsLocked =
		busy ||
		editing ||
		workEditing ||
		recordDraft !== null ||
		remoteActive ||
		planningDirty ||
		managingLayers ||
		savingLayers;
	const mutationControlsLocked = controlsLocked || hasUnsavedPolygons;
	const navigationLocked =
		(busy && !automatic) ||
		editing ||
		workEditing ||
		recordDraft !== null ||
		planningDirty ||
		managingLayers ||
		savingLayers;
	const [confirmation, setConfirmation] = useState<
		"delete" | "restart" | "replace" | "polygon" | null
	>(null);
	const [polygonDeletion, setPolygonDeletion] = useState<PolygonDelete | null>(
		null,
	);
	const [deleting, setDeleting] = useState(false);
	const [deletingPolygon, setDeletingPolygon] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [dismissedReviewWarnings, setDismissedReviewWarnings] = useState<
		Set<string>
	>(() => new Set());
	const [progress, setProgress] = useState(0);
	const [phase, setPhase] = useState<VisualAnalysisPhase>("idle");
	const [progressUnavailable, setProgressUnavailable] = useState(false);
	const [feedbackRequest, setFeedbackRequest] = useState(0);
	const [throughDay, setThroughDay] = useState<number | null>(null);
	const [includeUndated, setIncludeUndated] = useState(false);
	const [onlySelectedDay, setOnlySelectedDay] = useState(false);
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
	const showDrawing = useCallback(
		(value: VisualDrawing) => {
			resourceCache.rememberDrawing(value);
			setDrawing(value);
		},
		[resourceCache],
	);
	const showIndex = useCallback((value: Index, resetLayers = false) => {
		setIndex(value);
		if (!resetLayers) return;
		setLayers(
			(
				value.layerConfiguration?.settings ?? defaultLayerConfiguration.settings
			).categories.map((category) => category.id),
		);
	}, []);
	const loadIndex = useCallback(
		(force = false) =>
			resourceCache.loadIndex(
				() => (preload ? fetchVisualIndex(siteId) : getVisualDrawings(siteId)),
				{ force },
			),
		[resourceCache, siteId, preload],
	);
	useEffect(() => () => resourceCache.clear(), [resourceCache]);
	useEffect(() => {
		const invalidate = (event: Event) => {
			const detail = (event as CustomEvent<{ siteId?: string }>).detail;
			if (detail?.siteId === siteId) resourceCache.invalidatePlanning();
		};
		window.addEventListener(VISUAL_PLANNING_CACHE_INVALIDATED, invalidate);
		return () =>
			window.removeEventListener(VISUAL_PLANNING_CACHE_INVALIDATED, invalidate);
	}, [resourceCache, siteId]);
	useEffect(() => {
		if (!projectReady) return;
		if (initialProject.current && !resourceCache.peekIndex()) {
			resourceCache.seedProject(
				initialProject.current,
				projectData.persistence,
			);
			appliedProjectVersion.current = initialProject.current.version;
		}
		const run = ++epoch.current;
		const cached = resourceCache.peekIndex();
		setIndex(cached ?? null);
		setLocation("");
		setDrawing(null);
		setSelected(null);
		setFile(null);
		setRecordDraft(null);
		setRecordArea(null);
		setEditing(false);
		setRecordSaving(false);
		setSyncedAt(null);
		if (cached) showIndex(cached, true);
		void loadIndex().then(
			(data) => {
				if (run !== epoch.current) return;
				showIndex(data, !cached);
				reportPreparation("visual-index");
				const first = firstAssignedDrawing(data);
				if (preload)
					void resourceCache
						.prepareProject(
							data.drawings,
							(id) => fetchVisualPlanning(siteId, id),
							(step, status, counts) => {
								if (run === epoch.current)
									reportPreparation(step, status, counts);
							},
							() => run !== epoch.current,
						)
						.catch(() => {});
				else if (!first)
					for (const step of [
						"visual-drawing",
						"visual-planning",
						"visual-preview",
					])
						reportPreparation(step);
			},
			() => {
				if (run === epoch.current)
					for (const step of [
						"visual-index",
						"visual-drawing",
						"visual-planning",
						"visual-preview",
					])
						reportPreparation(step, "error");
				if (run === epoch.current && !cached)
					setError("Neizdevās ielādēt lokācijas un rasējumus.");
			},
		);
		return () => {
			++epoch.current;
			++requestId.current;
		};
	}, [
		loadIndex,
		resourceCache,
		showIndex,
		preload,
		siteId,
		reportPreparation,
		projectReady,
		projectData.persistence,
	]);
	const pollDrawingId = drawing?.id;
	useEffect(() => {
		if ((!active && !preload) || !pollDrawingId) return;
		void resourceCache
			.loadPlanning(pollDrawingId, () =>
				getVisualPlanning(siteId, pollDrawingId),
			)
			.catch(() => {});
	}, [active, preload, pollDrawingId, resourceCache, siteId]);
	useEffect(() => {
		if (
			preload ||
			(!active && !preload) ||
			!pollDrawingId ||
			!index?.drawings.length ||
			planningDirty ||
			editing ||
			workEditing
		)
			return;
		const position = index.drawings.findIndex(
			(item) => item.id === pollDrawingId,
		);
		const next = index.drawings[(position + 1) % index.drawings.length];
		if (!next || next.id === pollDrawingId) return;
		let cancelled = false;
		const timer = setTimeout(() => {
			void (async () => {
				const previous =
					index.drawings[
						(position - 1 + index.drawings.length) % index.drawings.length
					];
				const neighbors = new Set([next.id, previous.id]);
				for (const id of neighbors) {
					if (cancelled) return;
					await resourceCache
						.prefetch(id, () => getVisualPlanning(siteId, id))
						.catch(() => {});
				}
				for (const item of index.drawings) {
					if (cancelled) return;
					if (item.id === pollDrawingId || neighbors.has(item.id)) continue;
					await resourceCache
						.prefetch(item.id, () => getVisualPlanning(siteId, item.id))
						.catch(() => {});
				}
			})();
		}, 300);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [
		active,
		preload,
		pollDrawingId,
		index?.drawings,
		resourceCache,
		siteId,
		planningDirty,
		editing,
		workEditing,
	]);
	useEffect(() => {
		if (!active) return;
		const refreshIfVisible = async () => {
			if (document.visibilityState !== "visible") return;
			const run = epoch.current;
			try {
				const data = await loadIndex();
				if (run === epoch.current) showIndex(data);
			} catch {}
			if (!pollDrawingId) return;
			try {
				const value = await resourceCache.loadDrawing(pollDrawingId);
				if (run === epoch.current)
					setDrawing((current) =>
						current?.id === pollDrawingId ? value : current,
					);
			} catch {}
		};
		const timer = window.setInterval(refreshIfVisible, 60_000);
		window.addEventListener("focus", refreshIfVisible);
		document.addEventListener("visibilitychange", refreshIfVisible);
		return () => {
			window.clearInterval(timer);
			window.removeEventListener("focus", refreshIfVisible);
			document.removeEventListener("visibilitychange", refreshIfVisible);
		};
	}, [active, loadIndex, pollDrawingId, resourceCache, showIndex]);
	useEffect(() => {
		function onPhotoDeleted(event: Event) {
			const detail = (event as CustomEvent<DiaryPhotoDeleted>).detail;
			if (detail.siteId !== siteId) return;
			const urls = new Set(detail.deletedUrls);
			const recordIds = new Set(detail.deletedRecordIds ?? []);
			const pruneDrawing = (previous: VisualDrawing) => {
				const state = pruneVisualEvidence(
					previous.state,
					(item) => !(urls.has(item.photoUrl) && recordIds.has(item.recordId)),
				);
				return state === previous.state ? previous : { ...previous, state };
			};
			resourceCache.updateDrawings(pruneDrawing);
			setDrawing((previous) => {
				if (!previous) return previous;
				return pruneDrawing(previous);
			});
		}
		window.addEventListener(DIARY_PHOTO_DELETED, onPhotoDeleted);
		return () =>
			window.removeEventListener(DIARY_PHOTO_DELETED, onPhotoDeleted);
	}, [siteId, resourceCache]);
	const shouldPoll =
		active &&
		mode === "actual" &&
		(phase === "analyzing" || drawing?.state.status === "running");
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
					showDrawing(data);
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
	}, [siteId, pollDrawingId, shouldPoll, showDrawing]);
	const loadDrawing = useCallback(
		async (id: string, fresh = false) => {
			const request = ++requestId.current;
			if (fresh) resourceCache.removeDrawing(id);
			const cached = resourceCache.peekDrawing(id);
			setDrawing(cached ?? null);
			setLoading(!cached);
			setSelected(null);
			setThroughDay(null);
			setIncludeUndated(false);
			setError(null);
			setNotice(null);
			try {
				const data = await resourceCache.loadDrawing(id);
				if (request === requestId.current) {
					if (data !== cached) showDrawing(data);
					setLocation(data.state.location);
					return data as VisualDrawing;
				}
			} catch {
				if (request === requestId.current && !cached)
					setError("Neizdevās ielādēt rasējumu.");
			} finally {
				if (request === requestId.current) setLoading(false);
			}
			return null;
		},
		[resourceCache, showDrawing],
	);
	const selectLocation = useCallback(
		(value: string) => {
			++requestId.current;
			setLocation(value);
			setDrawing(null);
			setSelected(null);
			setFile(null);
			setError(null);
			setNotice(null);
			setSyncedAt(null);
			setLoading(false);
			const assigned = index?.drawings.find(
				(item) =>
					normalizeVisualLocation(item.location) ===
					normalizeVisualLocation(value),
			);
			if (assigned) void loadDrawing(assigned.id);
		},
		[index, loadDrawing],
	);
	const firstLocation =
		(preload && index ? firstAssignedDrawing(index)?.location : undefined) ??
		index?.locations[0] ??
		"";
	useEffect(() => {
		if ((!active && !preload) || location || !firstLocation) return;
		selectLocation(firstLocation);
	}, [active, preload, firstLocation, location, selectLocation]);
	async function analyze(id: string, run: number, request: number) {
		++analysisVersion.current;
		try {
			const response = await fetch(endpoint(id), { method: "POST" });
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Analīze neizdevās.");
			if (run !== epoch.current) return;
			const result = data as VisualDrawing;
			++analysisVersion.current;
			resourceCache.rememberDrawing(result);
			if (request === requestId.current) setDrawing(result);
		} finally {
			++analysisVersion.current;
		}
	}
	async function process(
		mode: "upload" | "resume" | "refresh" | "restart",
		auto = false,
	) {
		if (
			busyRef.current ||
			editing ||
			workEditing ||
			remoteActive ||
			polygonSaves.hasPending()
		)
			return;
		const run = epoch.current;
		const request = requestId.current;
		busyRef.current = true;
		setBusy(true);
		setAutomatic(auto);
		if (!auto) setFeedbackRequest((value) => value + 1);
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
				resourceCache.rememberDrawing(loaded);
				if (request !== requestId.current) return;
				showDrawing(loaded);
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
			loaded ??= mode === "resume" ? drawing : await loadDrawing(id, true);
			if (!loaded || run !== epoch.current) return;
			if (!loaded.state.evidence.length) {
				setNotice(
					"PDF saglabāts plānošanai. Kad žurnālam pievienosiet šīs lokācijas attēlus, izmantojiet “Atjaunot no žurnāla”, lai izveidotu izpildes zonas.",
				);
				setPhase("idle");
				resourceCache.invalidateIndex();
				const data = await loadIndex(true);
				if (run === epoch.current) showIndex(data);
				return;
			}
			previousAttempt.current = loaded.state.attempts.at(-1)?.id;
			setProgressUnavailable(false);
			setPhase("analyzing");
			await analyze(id, run, requestId.current);
			if (run !== epoch.current || (auto && request !== requestId.current))
				return;
			setPhase("idle");
			resourceCache.invalidateIndex();
			const data = await loadIndex(true);
			if (run === epoch.current) showIndex(data);
		} catch (issue) {
			if (run === epoch.current && request === requestId.current)
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
	const diarySyncRevisions = useRef<Map<string, string> | null>(null);
	if (!diarySyncRevisions.current && projectData.snapshot)
		diarySyncRevisions.current = new Map(
			projectData.snapshot.drawings.map((item) => [
				item.drawing.id,
				projectData.snapshot?.partVersions?.diary ??
					projectData.snapshot!.version,
			]),
		);
	useVisualAutoSync({
		active: active && mode === "actual",
		scope: drawing ? `${siteId}:${drawing.id}` : null,
		blocked: mutationControlsLocked || loading || !!confirmation,
		sync: async () => {
			const revision =
				projectData.snapshot?.partVersions?.diary ??
				projectData.snapshot?.version;
			if (
				projectData.enabled &&
				drawing &&
				revision === diarySyncRevisions.current?.get(drawing.id)
			)
				return;
			await process("refresh", true);
			if (drawing && revision)
				diarySyncRevisions.current?.set(drawing.id, revision);
		},
	});
	async function resolveReview(reanalyze: boolean) {
		if (!drawing || !source || mutationControlsLocked || busyRef.current)
			return;
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
			showDrawing(updated);
			if (reanalyze) {
				previousAttempt.current = updated.state.attempts.at(-1)?.id;
				setPhase("analyzing");
				await analyze(drawing.id, run, requestId.current);
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
	async function removePolygon(deletion: PolygonDelete) {
		if (
			!drawing ||
			busyRef.current ||
			editing ||
			workEditing ||
			polygonSaves.hasPending()
		)
			return;
		const run = epoch.current;
		busyRef.current = true;
		setBusy(true);
		setDeletingPolygon(true);
		setError(null);
		try {
			const updated = await deleteVisualPolygon(siteId, drawing.id, deletion);
			if (run !== epoch.current) return;
			++requestId.current;
			showDrawing(updated);
			setSelected((value) => (value === deletion.markId ? null : value));
			setNotice(
				"Poligons dzēsts. Pārējie poligoni, žurnāla ieraksts un avota foto saglabāti.",
			);
		} catch (issue) {
			if (run === epoch.current)
				setError(
					issue instanceof Error
						? issue.message
						: "Neizdevās dzēst poligonu. Mēģiniet vēlreiz.",
				);
		} finally {
			busyRef.current = false;
			if (run === epoch.current) {
				setBusy(false);
				setDeletingPolygon(false);
			}
		}
	}
	async function removeDrawing() {
		if (!drawing || busyRef.current || polygonSaves.hasPending()) return;
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
			resourceCache.removeDrawing(id);
			setDrawing(null);
			setSelected(null);
			setIndex((previous) => {
				if (!previous) return previous;
				const next = {
					...previous,
					drawings: previous.drawings.filter((item) => item.id !== id),
				};
				resourceCache.rememberIndex(next);
				return next;
			});
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
	useEffect(() => {
		const snapshot = projectData.snapshot;
		if (
			!snapshot ||
			snapshot.version === appliedProjectVersion.current ||
			hasUnsavedPolygons ||
			planningSaveState.length ||
			editing ||
			planningDirty ||
			workEditing ||
			recordDraft
		)
			return;
		resourceCache.seedProject(snapshot, projectData.persistence);
		appliedProjectVersion.current = snapshot.version;
		showIndex(snapshot.index);
		const selected = snapshot.drawings.find(
			(item) =>
				normalizeVisualLocation(item.drawing.state.location) ===
				normalizeVisualLocation(location),
		);
		if (selected) setDrawing(selected.drawing);
	}, [
		projectData.snapshot,
		projectData.persistence,
		hasUnsavedPolygons,
		planningSaveState.length,
		editing,
		planningDirty,
		workEditing,
		recordDraft,
		resourceCache,
		showIndex,
		location,
	]);
	const categorizedMarks = useMemo(
		() =>
			optimisticDrawing
				? projectVisualMarks(
						optimisticDrawing.state.marks,
						optimisticDrawing.state.evidence,
						optimisticDrawing.id,
						layerConfiguration.settings,
						layerConfiguration.positionIds,
					)
				: [],
		[optimisticDrawing, layerConfiguration],
	);
	const datedMarks = useMemo(
		() =>
			cumulativeVisualMarks(
				categorizedMarks,
				timeline.dayByEvidence,
				selectedDay,
				includeUndated || selectedDay === null,
				onlySelectedDay,
			),
		[
			categorizedMarks,
			timeline.dayByEvidence,
			selectedDay,
			includeUndated,
			onlySelectedDay,
		],
	);
	const visibleMarks = useMemo(
		() =>
			sortVisualMarksChronologically(
				datedMarks.filter((mark) => layers.includes(mark.layer)),
				drawing?.state.evidence ?? [],
			),
		[datedMarks, layers, drawing?.state.evidence],
	);
	const undatedCount =
		drawing?.state.marks.filter(
			(mark) => timeline.dayByEvidence.get(mark.evidenceId) == null,
		).length ?? 0;
	const selectedMark = visibleMarks.find((mark) => mark.id === selected);
	const source = drawing?.state.evidence.find(
		(item) => item.id === selectedMark?.evidenceId,
	);
	const sourceRecord = projectData.snapshot?.diary.rows.find(
		(row) => row.id === source?.recordId,
	);
	const sourcePhotos = sourceRecord?.sectionMapping
		? sectionMappingOriginalPhotos(sourceRecord.sectionMapping)
		: source?.manual && sourceRecord
			? normalizeDiaryPhotoUrls(sourceRecord.Photos)
			: !sourceRecord && projectData.enabled
				? []
				: undefined;
	const recordChoices = useMemo<VisualRecordChoice[]>(() => {
		const snapshot = projectData.snapshot;
		if (!snapshot || !drawing) return [];
		const linked = new Set(
			[
				drawing,
				...snapshot.drawings
					.filter((item) => item.drawing.id !== drawing.id)
					.map((item) => item.drawing),
			].flatMap((item) =>
				item.state.marks.map(
					(mark) =>
						item.state.evidence.find((source) => source.id === mark.evidenceId)
							?.recordId,
				),
			),
		);
		return snapshot.diary.rows
			.filter(
				(row) =>
					!row.Location?.trim() ||
					normalizeVisualLocation(row.Location) ===
						normalizeVisualLocation(drawing.state.location),
			)
			.map((row) => ({
				id: row.id,
				date: row.Date ? new Date(row.Date).toISOString() : null,
				work: row.Works,
				location: row.Location,
				amount: row.Amounts,
				unit: row.Units,
				hasDrawing: linked.has(row.id),
				originalMessage: row.originalUserComment,
			}))
			.sort(
				(a, b) =>
					Number(a.hasDrawing) - Number(b.hasDrawing) ||
					(b.date ?? "").localeCompare(a.date ?? ""),
			);
	}, [projectData.snapshot, drawing]);
	function selectZone(id: string | null) {
		if (editing || workEditing || savingLayers || managingLayers || recordDraft)
			return;
		setSelected(id);
	}
	function cancelRecord() {
		if (recordSaving) return;
		setRecordDraft(null);
		setRecordArea(null);
		setEditing(false);
	}
	async function persistLayers(settings: VisualLayerSettings) {
		const run = epoch.current;
		const previous = layerConfiguration.settings;
		setSavingLayers(true);
		try {
			const saved = await saveVisualLayers(siteId, settings, previous);
			if (run !== epoch.current) return;
			setIndex((current) => {
				if (!current) return current;
				const next = {
					...current,
					layerConfiguration: { ...layerConfiguration, settings: saved },
				};
				resourceCache.rememberIndex(next);
				return next;
			});
			setLayers((current) => [
				...new Set([
					...current
						.map((id) =>
							saved.categories.some((c) => c.id === id)
								? id
								: saved.redirects[id],
						)
						.filter((id): id is string => !!id),
					...saved.categories
						.filter((c) => !previous.categories.some((old) => old.id === c.id))
						.map((c) => c.id),
				]),
			]);
			setNotice(
				"Slāņi saglabāti visām projekta lokācijām. Zonu ģeometrija nav mainīta.",
			);
		} finally {
			if (run === epoch.current) setSavingLayers(false);
		}
	}
	async function changeZoneLayer(layerId: string | null) {
		if (!drawing || !selectedMark || controlsLocked) return;
		const settings = layerConfiguration.settings;
		const zones = settings.zones.filter(
			(z) => z.drawingId !== drawing.id || z.markId !== selectedMark.id,
		);
		if (layerId)
			zones.push({ drawingId: drawing.id, markId: selectedMark.id, layerId });
		try {
			await persistLayers({ ...settings, zones });
			setLayers((values) => [
				...new Set([
					...values,
					layerId ??
						resolveVisualWorkLayer(
							source?.work ?? "",
							settings,
							layerConfiguration.positionIds,
						),
				]),
			]);
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Neizdevās mainīt zonas slāni.",
			);
		}
	}
	const reviewedSources =
		drawing?.state.evidence.filter((item) => item.reviewRequired) ?? [];
	const reviewWarningKey = JSON.stringify([
		siteId,
		drawing?.id,
		reviewedSources
			.map((item) => [
				item.id,
				item.sourceRevision ?? [
					item.work,
					item.photoUrl,
					item.description,
					item.date,
					item.amount,
					item.unit,
				],
			])
			.sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
	]);
	const showReviewWarning =
		reviewedSources.length > 0 &&
		!dismissedReviewWarnings.has(reviewWarningKey);
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
			{managingLayers ? (
				<VisualLayerManager
					configuration={{
						...layerConfiguration,
						workOptions: [
							...new Set([
								...layerConfiguration.workOptions,
								...(drawing?.state.evidence
									.map((source) => source.work)
									.filter(Boolean) ?? []),
							]),
						],
					}}
					onSave={persistLayers}
					onClose={() => setManagingLayers(false)}
				/>
			) : null}
			<header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 shrink-0"
					disabled={!drawing}
					aria-expanded={sidebarOpen}
					aria-controls={`${fileId}-sidebar`}
					aria-label={
						mode === "planning"
							? sidebarOpen
								? "Paslēpt darbu plānu"
								: "Rādīt darbu plānu"
							: sidebarOpen
								? "Paslēpt slāņus un avotus"
								: "Rādīt slāņus un avotus"
					}
					title={
						mode === "planning"
							? sidebarOpen
								? "Paslēpt darbu plānu"
								: "Rādīt darbu plānu"
							: sidebarOpen
								? "Paslēpt slāņus un avotus"
								: "Rādīt slāņus un avotus"
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
					disabled={navigationLocked || !index}
					onValueChange={selectLocation}
				>
					<SelectTrigger
						className="h-8 w-28 shrink-0 sm:w-36"
						aria-label="Lokācija"
					>
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
				<fieldset className="flex shrink-0 items-center rounded-lg bg-muted p-0.5">
					<legend className="sr-only">Izpildshēmu režīms</legend>
					<Button
						size="sm"
						variant={mode === "actual" ? "outline" : "ghost"}
						className="h-7 px-2 text-xs shadow-none"
						aria-label="Izpilde"
						aria-pressed={mode === "actual"}
						disabled={planningDirty}
						title={
							planningDirty
								? "Saglabājiet vai atceliet plāna izmaiņas"
								: "Rādīt faktiski izpildīto"
						}
						onClick={() => setMode("actual")}
					>
						<ClipboardCheck className="h-3.5 w-3.5" />
						<span className="sm:hidden">Fakts</span>
						<span className="hidden sm:inline">Izpilde</span>
					</Button>
					<Button
						size="sm"
						variant={mode === "planning" ? "outline" : "ghost"}
						className="h-7 px-2 text-xs shadow-none"
						aria-label="Plānošana"
						aria-pressed={mode === "planning"}
						disabled={
							editing ||
							workEditing ||
							hasUnsavedPolygons ||
							recordDraft !== null
						}
						title="Plānot darbus rasējumā"
						onClick={() => {
							setSelected(null);
							setSidebarOpen(true);
							setMode("planning");
						}}
					>
						<CalendarRange className="h-3.5 w-3.5" />
						<span className="sm:hidden">Plāns</span>
						<span className="hidden sm:inline">Plānošana</span>
					</Button>
				</fieldset>
				<span
					className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
					title={drawing?.name}
				>
					{drawing?.name || locationDrawings[0]?.name}
				</span>
				{drawing && mode === "actual" ? (
					<>
						<output
							className={
								automatic
									? "absolute bottom-14 left-3 z-40 shrink-0 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground shadow-sm lg:static lg:border-0 lg:p-0 lg:shadow-none"
									: "hidden shrink-0 text-xs text-muted-foreground lg:block"
							}
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
						{drawing.state.evidence.length > 0 &&
						!["complete", "unlocated"].includes(drawing.state.status) ? (
							<Button
								size="sm"
								variant="outline"
								aria-label="Turpināt analīzi"
								title="Turpināt analīzi"
								disabled={mutationControlsLocked}
								onClick={() => void process("resume")}
							>
								<Play className="h-4 w-4" />
								<span className="hidden md:inline">Turpināt analīzi</span>
							</Button>
						) : null}
						<Button
							size="sm"
							className="shrink-0"
							aria-label="Atjaunot no žurnāla"
							title="Atjaunot no žurnāla"
							variant="outline"
							disabled={mutationControlsLocked}
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
										disabled={mutationControlsLocked || loading || !location}
										onChange={(event) =>
											setFile(event.target.files?.[0] ?? null)
										}
									/>
								</div>
								<Button
									disabled={
										mutationControlsLocked || loading || !file || !location
									}
									onClick={() =>
										locationDrawings.length
											? setConfirmation("replace")
											: void process("upload")
									}
								>
									Augšupielādēt PDF
								</Button>
							</div>
						</details>

						{drawing ? (
							<>
								<div className="flex flex-wrap gap-2">
									<Button
										variant="outline"
										disabled={mutationControlsLocked || loading}
										onClick={() => setConfirmation("restart")}
									>
										Sākt analīzi no jauna
									</Button>
									<Button
										variant="destructive"
										disabled={mutationControlsLocked || loading}
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
			<VisualPlanningSaveStatus
				queue={planningSaves}
				items={planningSaveState}
				onDiscard={(id) => {
					resourceCache.invalidatePlanning(id);
					window.dispatchEvent(
						new CustomEvent(VISUAL_PLANNING_CACHE_INVALIDATED, {
							detail: { siteId },
						}),
					);
				}}
			/>
			<div
				className="relative min-h-0 flex-1 overflow-hidden"
				data-testid="visual-canvas-workspace"
			>
				{mode === "actual" ? (
					<VisualPolygonSaveStatus
						state={polygonSaveState}
						locked={editing || workEditing}
						label={(item) => {
							const cached = resourceCache.peekDrawing(item.drawingId);
							const mark = cached?.state.marks.find(
								(mark) => mark.id === item.edit.markId,
							);
							return `${cached?.state.location ?? "Zona"} · ${cached?.state.evidence.find((source) => source.id === mark?.evidenceId)?.work ?? "Zonas labojums"}`;
						}}
						onRetry={(item) =>
							polygonSaves.retry(item.drawingId, item.edit.markId)
						}
						onDiscard={(item) => {
							polygonSaves.discard(item.drawingId, item.edit.markId);
							if (!polygonSaves.hasPending(item.drawingId)) {
								resourceCache.invalidateDrawing(item.drawingId);
								if (drawing?.id === item.drawingId)
									void loadDrawing(item.drawingId);
							}
						}}
					/>
				) : null}
				{drawing ? (
					<>
						<div
							hidden={mode !== "planning"}
							inert={mode !== "planning"}
							className="absolute inset-0"
						>
							<VisualPlanningPanel
								showSaveStatus={false}
								active={active && mode === "planning"}
								resourceCache={resourceCache}
								layerConfiguration={layerConfiguration}
								key={drawing.id}
								siteId={siteId}
								drawing={drawing}
								sidebarOpen={sidebarOpen}
								onDirtyChange={setPlanningDirty}
							/>
						</div>
						<div
							hidden={mode !== "actual"}
							inert={mode !== "actual"}
							className="relative h-full overflow-hidden"
						>
							<VisualPdf
								active={active && mode === "actual"}
								resourceCache={resourceCache}
								layerStyles={layerStyles}
								key={drawing.id}
								fillWorkspace
								onCreateRecord={() => {
									if (
										mutationControlsLocked ||
										drawing.state.status === "running"
									)
										return;
									setSelected(null);
									setRecordArea(null);
									setRecordDraft({ id: crypto.randomUUID(), areas: [] });
								}}
								createRecordBlockedReason={
									busy || remoteActive || drawing.state.status === "running"
										? "Pieejams pēc zonu atjaunošanas."
										: mutationControlsLocked
											? "Pabeidziet vai atceliet pašreizējās izmaiņas."
											: undefined
								}
								planning={
									recordDraft
										? {
												planId: null,
												purpose: "record",
												areas: recordDraft.areas,
												selectedArea: recordArea,
												areaRequest: 1,
												interactionKey: recordDraft.id,
												editable: !recordSaving,
												label: "Jaunais izpildes ieraksts",
												onChange: (areas) =>
													setRecordDraft((current) =>
														current ? { ...current, areas } : null,
													),
												onSelectArea: setRecordArea,
												onEditingChange: setEditing,
											}
										: undefined
								}
								url={`${endpoint(drawing.id)}?pdf=1`}
								marks={visibleMarks}
								evidence={drawing.state.evidence}
								selected={selectedMark?.id ?? null}
								onSelect={selectZone}
								editable={
									!busy &&
									!workEditing &&
									!managingLayers &&
									!savingLayers &&
									!polygonSaveState.items.some(
										(item) =>
											item.drawingId === drawing.id &&
											(item.edit.markId === selectedMark?.id ||
												item.edit.group?.expected.some(
													(part) => part.markId === selectedMark?.id,
												)),
									) &&
									drawing.state.status !== "running"
								}
								onEditingChange={setEditing}
								deletable={!hasUnsavedPolygons}
								onDelete={(deletion) => {
									if (polygonSaves.hasPending()) return;
									setPolygonDeletion(deletion);
									setConfirmation("polygon");
								}}
								onQueueSave={(edit) => {
									if (busyRef.current || remoteActive)
										throw new Error(
											"Uzgaidiet, līdz rasējuma atjaunināšana ir pabeigta.",
										);
									polygonSaves.enqueue(drawing.id, edit);
								}}
							/>
							{recordDraft ? (
								<>
									<Button
										className="absolute bottom-16 left-3 z-40"
										variant="outline"
										size="sm"
										disabled={recordSaving}
										onClick={cancelRecord}
									>
										Atcelt zonas pievienošanu
									</Button>
									<VisualRecordForm
										key={recordDraft.id}
										siteId={siteId}
										drawingId={drawing.id}
										recordId={recordDraft.id}
										location={drawing.state.location}
										areas={recordDraft.areas}
										workOptions={layerConfiguration.workOptions}
										records={recordChoices}
										hidden={editing || !recordDraft.areas.length}
										onSavingChange={setRecordSaving}
										onCancel={cancelRecord}
										onSaved={(result) => {
											if (currentCache.current !== resourceCache) return;
											const savedMark = result.drawing.state.marks.find(
												(mark) => mark.id === result.markId,
											);
											const savedSource = result.drawing.state.evidence.find(
												(source) => source.id === savedMark?.evidenceId,
											);
											const savedDay = visualDiaryDay(
												savedSource?.date ?? null,
											);
											showDrawing({
												...result.drawing,
												latestDiaryDate: drawing.latestDiaryDate,
											});
											setRecordDraft(null);
											setRecordArea(null);
											setEditing(false);
											setThroughDay(savedDay);
											if (savedDay === null) {
												setIncludeUndated(true);
												setOnlySelectedDay(false);
											}
											setLayers((current) => [
												...new Set([
													...current,
													resolveVisualWorkLayer(
														savedSource?.work ?? "",
														layerConfiguration.settings,
														layerConfiguration.positionIds,
													),
												]),
											]);
											setSelected(result.markId);
											resourceCache.invalidatePlanning();
											setNotice(
												result.assignmentWarning ??
													"Zona saglabāta un piesaistīta žurnāla ierakstam.",
											);
										}}
									/>
								</>
							) : null}
							<VisualZoneDetails
								layerStyles={layerStyles}
								layerOverride={
									layerConfiguration.settings.zones.find(
										(z) =>
											z.drawingId === drawing.id &&
											z.markId === selectedMark?.id,
									)?.layerId
								}
								onLayerChange={(layerId) => void changeZoneLayer(layerId)}
								siteId={siteId}
								drawingId={drawing.id}
								source={source}
								photos={sourcePhotos}
								originalMessage={sourceRecord?.originalUserComment}
								mark={selectedMark}
								progressPending={
									!!sourceProgress && sourceProgress.status !== "complete"
								}
								editorLocked={
									busy ||
									hasUnsavedPolygons ||
									editing ||
									remoteActive ||
									managingLayers ||
									savingLayers
								}
								closeLocked={editing || workEditing}
								controlsLocked={mutationControlsLocked}
								onClose={() => selectZone(null)}
								onEditingChange={setWorkEditing}
								onResolveReview={resolveReview}
								onSaved={(updated) => {
									if (!source) return;
									showDrawing(updated);
									setLayers((values) => [
										...new Set([
											...values,
											resolveVisualWorkLayer(
												updated.state.evidence.find(
													(item) => item.id === source.id,
												)?.work ?? source.work,
												layerConfiguration.settings,
												layerConfiguration.positionIds,
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
								layerStyles={layerStyles}
								onManageLayers={() => setManagingLayers(true)}
								managementLocked={hasUnsavedPolygons}
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
								locked={controlsLocked}
							/>
						</div>
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
				<VisualFeedbackPanel
					key={JSON.stringify([
						siteId,
						drawing?.id ?? location,
						drawing?.state.attempts.at(-1)?.id,
						feedbackRequest,
						reviewWarningKey,
					])}
					visible={
						mode === "actual" &&
						Boolean(
							(!automatic &&
								(busy ||
									(drawing &&
										!["complete", "unlocated"].includes(
											drawing.state.status,
										)))) ||
								error ||
								drawing?.state.error ||
								showReviewWarning,
						)
					}
				>
					{deletingPolygon ? (
						<output className="flex items-center gap-2 text-xs">
							<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
							Dzēš poligonu…
						</output>
					) : !automatic ? (
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
					{showReviewWarning ? (
						<div className="flex items-start gap-2">
							<p className="min-w-0 flex-1 text-xs">
								Žurnālā mainīti {reviewedSources.length} manuāli pielāgotu zonu
								avoti. Zonas saglabātas; izvēlieties avotu un pārskatiet
								izmaiņas.
							</p>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-7 w-7 shrink-0"
								aria-label="Aizvērt brīdinājumu par zonu avotiem"
								onClick={() =>
									setDismissedReviewWarnings(
										(previous) => new Set([...previous, reviewWarningKey]),
									)
								}
							>
								<X className="h-4 w-4" aria-hidden="true" />
							</Button>
						</div>
					) : null}
				</VisualFeedbackPanel>
				{mode === "actual" && notice ? (
					<output className="pointer-events-none absolute bottom-3 left-1/2 z-40 max-w-[90%] -translate-x-1/2 rounded-md border bg-background/95 px-3 py-2 text-xs shadow-sm">
						{notice}
					</output>
				) : null}
			</div>
			{drawing && mode === "actual" ? (
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
						onlySelectedDay={onlySelectedDay}
						onOnlySelectedDay={(value) => {
							setOnlySelectedDay(value);
							setSelected(null);
						}}
					/>
				</fieldset>
			) : null}
			<AlertDialog
				open={confirmation !== null}
				onOpenChange={(open) => {
					if (!open) {
						setConfirmation(null);
						setPolygonDeletion(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{confirmation === "polygon"
								? "Dzēst izvēlēto poligonu?"
								: confirmation === "delete"
									? "Dzēst rasējumu?"
									: confirmation === "replace"
										? "Aizstāt lokācijas rasējumu?"
										: "Sākt analīzi no jauna?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{confirmation === "polygon"
								? "Tiks dzēsts tikai izvēlētais poligons. Pārējie šī darba poligoni, žurnāla ieraksts un avota foto netiks mainīti. Parasta atjaunošana to neatjaunos; atkārtota avota analīze vai visas analīzes sākšana no jauna var to izveidot atkārtoti."
								: confirmation === "delete"
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
								if (confirmation === "polygon" && polygonDeletion)
									void removePolygon(polygonDeletion);
								else if (confirmation === "delete") void removeDrawing();
								else if (confirmation === "replace") void process("upload");
								else void process("restart");
							}}
						>
							{confirmation === "delete" || confirmation === "polygon"
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
