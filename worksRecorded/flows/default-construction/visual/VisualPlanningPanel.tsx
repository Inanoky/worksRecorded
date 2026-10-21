"use client";

import {
	Archive,
	ChevronDown,
	ContactRound,
	Loader2,
	MessageCircle,
	Plus,
	RotateCcw,
	TriangleAlert,
	X,
} from "lucide-react";
import Link from "next/link";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	archiveVisualPlanningItem,
	getVisualPlanning,
	restoreVisualPlanningItem,
	saveVisualDrawingScale,
} from "./actions";
import { isAreaUnit, roundedArea } from "./drawing-scale";
import {
	defaultVisualLayerSettings,
	resolveVisualWorkLayer,
	type VisualLayerConfiguration,
	visualLayerStyles,
} from "./layer-settings";
import { type VisualDrawing, visualLayers } from "./model";
import type {
	VisualPlan,
	VisualPlanArea,
	VisualPlanInput,
} from "./planning-model";
import { sameVisualPlanningContent } from "./planning-save-queue";
import { sectionKey } from "./sections";
import { usePlanningSaveQueue } from "./usePlanningSaveQueue";
import { VisualPdf, type VisualPlanAreaSelection } from "./VisualPdf";
import { VisualPlanningSaveStatus } from "./VisualPlanningSaveStatus";
import { VisualPlanningWhatsApp } from "./VisualPlanningWhatsApp";
import { VisualSectionSelect } from "./VisualSectionSelect";
import { VisualTimeline } from "./VisualTimeline";
import {
	VISUAL_PLANNING_CACHE_INVALIDATED,
	VisualClientCache,
} from "./visual-client-cache";

type PlanningIndex = Awaited<ReturnType<typeof getVisualPlanning>>;
const defaultLayerConfiguration: VisualLayerConfiguration = {
	settings: defaultVisualLayerSettings(),
	workOptions: [],
	positionIds: {},
};
type PlanningItem = PlanningIndex["plans"][number];
type PlanningDraft = {
	id: string | null;
	version: number | null;
	work: string;
	unit: string;
	quantity: string;
	automaticQuantity: boolean;
	section: string | null;
	startDate: string;
	endDate: string;
	contactId: string | null;
	areas: VisualPlanArea[];
	archivedAt: string | null;
};
type PendingDrawerAction =
	| { type: "new" }
	| { type: "close" }
	| { type: "select"; planId: string; areaId?: string };

const statusLabels = {
	scheduled: "Plānots",
	active: "Notiek",
	completed: "Izpildīts",
	overdue: "Kavējas",
} as const;

const statusClasses = {
	scheduled: "border-slate-300 text-slate-700",
	active: "border-teal-500 text-teal-800",
	completed: "border-emerald-500 text-emerald-800",
	overdue: "border-amber-500 text-amber-900",
} as const;

const whatsAppStatusLabels: Record<string, string> = {
	processing: "Apstrādā",
	pending: "Gaida",
	sent: "Nosūtīts",
	delivered: "Piegādāts",
	read: "Izlasīts",
	partial: "Daļēji nosūtīts",
	failed: "Neizdevās",
};

function whatsAppSendStatus(
	items: Array<{ status: string }>,
	fallback: string,
) {
	if (!items.length) return fallback;
	if (items.every((item) => item.status === "read")) return "read";
	if (
		items.every((item) => item.status === "delivered" || item.status === "read")
	)
		return "delivered";
	const successful = items.filter((item) =>
		["sent", "delivered", "read"].includes(item.status),
	).length;
	const failed = items.filter((item) => item.status === "failed").length;
	if (successful && failed) return "partial";
	if (failed === items.length) return "failed";
	if (successful === items.length) return "sent";
	return fallback;
}

function formatWhatsAppDateTime(value: string) {
	return new Intl.DateTimeFormat("lv-LV", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Europe/Riga",
	}).format(new Date(value));
}

function utcDay(date: string) {
	return Date.parse(`${date}T00:00:00Z`) / 86_400_000;
}

function dateFromUtcDay(day: number) {
	return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

export function visualPlanningTimelineRange(
	plans: Array<Pick<VisualPlan, "startDate" | "endDate">>,
) {
	if (!plans.length) return { firstDay: null, lastDay: null };
	return {
		firstDay: Math.min(...plans.map((plan) => utcDay(plan.startDate))),
		lastDay: Math.max(...plans.map((plan) => utcDay(plan.endDate))),
	};
}

export function cumulativeVisualPlanningPlans<
	T extends Pick<VisualPlan, "startDate">,
>(plans: T[], day: number | null) {
	return day === null
		? []
		: plans.filter((plan) => utcDay(plan.startDate) <= day);
}

export function visualPlanningTimelineBar(
	plan: Pick<VisualPlan, "startDate" | "endDate">,
	range: { start: string; end: string },
) {
	const rangeStart = utcDay(range.start);
	const rangeEnd = utcDay(range.end);
	const totalDays = Math.max(1, rangeEnd - rangeStart + 1);
	const visibleStart = Math.max(rangeStart, utcDay(plan.startDate));
	const visibleEnd = Math.min(rangeEnd, utcDay(plan.endDate));
	return {
		left: `${((visibleStart - rangeStart) / totalDays) * 100}%`,
		width: `${(Math.max(1, visibleEnd - visibleStart + 1) / totalDays) * 100}%`,
	};
}

function emptyDraft(
	index: PlanningIndex,
	startDate = index.today,
): PlanningDraft {
	const firstWork = index.workOptions[0];
	return {
		id: null,
		version: null,
		work: firstWork?.work ?? "",
		unit: firstWork?.unit || index.unitOptions[0] || "",
		quantity: "",
		automaticQuantity: true,
		section: null,
		startDate,
		endDate: startDate,
		contactId: null,
		areas: [],
		archivedAt: null,
	};
}

function draftFromPlan(plan: VisualPlan): PlanningDraft {
	return {
		id: plan.id,
		version: plan.version,
		work: plan.work,
		unit: plan.unit,
		quantity: String(plan.quantity),
		automaticQuantity: plan.geometry.quantitySource === "area",
		section: plan.geometry.section ?? null,
		startDate: plan.startDate,
		endDate: plan.endDate,
		contactId: plan.contactId,
		areas: plan.geometry.areas,
		archivedAt: plan.archivedAt,
	};
}

function formatPlanDate(date: string) {
	return new Intl.DateTimeFormat("lv-LV", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${date}T00:00:00Z`));
}

export function VisualPlanningPanel({
	active = true,
	siteId,
	drawing,
	sidebarOpen,
	onDirtyChange,
	layerConfiguration = defaultLayerConfiguration,
	resourceCache,
	showSaveStatus = true,
}: {
	active?: boolean;
	siteId: string;
	drawing: VisualDrawing;
	sidebarOpen: boolean;
	onDirtyChange: (dirty: boolean) => void;
	layerConfiguration?: VisualLayerConfiguration;
	resourceCache?: VisualClientCache;
	showSaveStatus?: boolean;
}) {
	const localCache = useMemo(() => new VisualClientCache(siteId), [siteId]);
	const cache = resourceCache ?? localCache;
	const { queue: planningSaves, state: planningSaveState } =
		usePlanningSaveQueue(cache, siteId);
	const styles = visualLayerStyles(layerConfiguration.settings);
	const workColor = (work: string) =>
		(
			styles[
				resolveVisualWorkLayer(
					work,
					layerConfiguration.settings,
					layerConfiguration.positionIds,
				)
			] ?? visualLayers.other
		).color;
	const [index, setIndex] = useState<PlanningIndex | null>(
		() => cache.peekPlanning(drawing.id) ?? null,
	);
	const [draft, setDraft] = useState<PlanningDraft | null>(null);
	const [measuredArea, setMeasuredArea] = useState<number | null>(null);
	const [pageScales, setPageScales] = useState<Record<string, number>>(
		() => drawing.state.pageScales ?? {},
	);
	const scaleRequests = useRef<Record<number, number>>({});
	const scaleScope = useRef(drawing.id);
	useEffect(() => {
		scaleScope.current = drawing.id;
		setPageScales(drawing.state.pageScales ?? {});
	}, [drawing.id, drawing.state.pageScales]);
	const changeScale = useCallback(
		async (page: number, scale: number | null) => {
			const expected = pageScales[page] ?? null;
			const request = (scaleRequests.current[page] ?? 0) + 1;
			scaleRequests.current[page] = request;
			const apply = (scale: number | null) => {
				setPageScales((current) => {
					const next = { ...current };
					if (scale === null) delete next[page];
					else next[page] = scale;
					return next;
				});
				const current = cache.peekDrawing(drawing.id) ?? drawing;
				const pageScales = { ...current.state.pageScales };
				if (scale === null) delete pageScales[page];
				else pageScales[page] = scale;
				cache.rememberDrawing({
					...current,
					state: { ...current.state, pageScales },
				});
			};
			apply(scale);
			try {
				await saveVisualDrawingScale(siteId, drawing.id, {
					page,
					scale,
					expected,
				});
			} catch (error) {
				if (
					scaleScope.current === drawing.id &&
					scaleRequests.current[page] === request
				)
					apply(expected);
				throw error;
			}
		},
		[cache, drawing, pageScales, siteId],
	);
	const [selectedArea, setSelectedArea] =
		useState<VisualPlanAreaSelection | null>(null);
	const [areaRequest, setAreaRequest] = useState(0);
	const [controlsHost, setControlsHost] = useState<HTMLDivElement | null>(null);
	const [planningSession, setPlanningSession] = useState(0);
	const [dirty, setDirty] = useState(false);
	const [areaEditing, setAreaEditing] = useState(false);
	const onMeasuredAreaChange = useCallback(
		(area: number | null) => {
			setMeasuredArea(area);
			if (
				area !== null &&
				draft?.automaticQuantity &&
				isAreaUnit(draft.unit) &&
				!draft.archivedAt &&
				!areaEditing &&
				roundedArea(area) !== Number(draft.quantity)
			)
				setDirty(true);
		},
		[
			draft?.automaticQuantity,
			draft?.unit,
			draft?.archivedAt,
			draft?.quantity,
			areaEditing,
		],
	);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showArchived, setShowArchived] = useState(false);
	const [planningDay, setPlanningDay] = useState<number | null>(null);
	const [whatsAppHistoryPlanId, setWhatsAppHistoryPlanId] = useState<
		string | null
	>(null);
	const [pendingDrawerAction, setPendingDrawerAction] =
		useState<PendingDrawerAction | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [conflict, setConflict] = useState<VisualPlan | null>(null);
	const editingRef = useRef(false);
	editingRef.current = dirty || areaEditing;
	const request = useRef(0);
	const wasActive = useRef(active);
	const drawerCloseButton = useRef<HTMLButtonElement>(null);
	const fieldId = useId();
	const archiveId = `${fieldId}-archive`;
	const workId = `${fieldId}-work`;
	const quantityId = `${fieldId}-quantity`;
	const unitId = `${fieldId}-unit`;
	const startId = `${fieldId}-start`;
	const endId = `${fieldId}-end`;
	const contactId = `${fieldId}-contact`;
	const drawerKey = draft ? (draft.id ?? "new") : null;
	const planPending = planningSaveState.some((item) => item.id === draft?.id);
	useEffect(() => {
		const value = cache.peekPlanning(drawing.id);
		if (!value) return;
		setIndex(value);
		const pending = planningSaveState.find((item) => item.id === draft?.id);
		if (pending?.status === "failed") {
			setConflict(pending.conflict ?? null);
			setError(pending.error ?? null);
		}
		if (!pending)
			setNotice((current) =>
				current === "Plāns saglabāts šajā cilnē. Notiek sinhronizācija."
					? "Plāns saglabāts."
					: current,
			);
		setDraft((current) => {
			if (!current?.id) return current;
			const plan = value.plans.find((item) => item.id === current.id);
			if (!plan) return dirty || areaEditing ? current : null;
			return dirty || areaEditing
				? { ...current, version: plan.version }
				: draftFromPlan(plan);
		});
	}, [cache, drawing.id, planningSaveState, dirty, areaEditing, draft?.id]);

	useEffect(() => {
		onDirtyChange(dirty || areaEditing);
	}, [areaEditing, dirty, onDirtyChange]);
	useEffect(() => {
		if (drawerKey) drawerCloseButton.current?.focus();
	}, [drawerKey]);
	useEffect(
		() => () => {
			onDirtyChange(false);
		},
		[onDirtyChange],
	);
	useEffect(() => {
		const run = ++request.current;
		const cached = cache.peekPlanning(drawing.id);
		setLoading(!cached);
		setError(null);
		const showInitial = (value: PlanningIndex) => {
			setIndex(value);
			setPlanningDay(null);
			setDraft(null);
			setPlanningSession((current) => current + 1);
			setSelectedArea(null);
			setDirty(false);
			setAreaEditing(false);
		};
		if (cached) showInitial(cached);
		const load = () => getVisualPlanning(siteId, drawing.id);
		void cache
			.loadPlanning(drawing.id, load)
			.then(
				(value) => {
					if (run !== request.current) return;
					const latest = cache.peekPlanning(drawing.id) ?? value;
					if (cached) setIndex(latest);
					else showInitial(latest);
				},
				() => {
					if (run === request.current && !cached)
						setError("Neizdevās ielādēt plānotos darbus.");
				},
			)
			.finally(() => {
				if (run === request.current) setLoading(false);
			});
		return () => {
			++request.current;
		};
	}, [drawing.id, cache, siteId]);

	const refreshPlanning = useCallback(async () => {
		if (!active || dirty || areaEditing || saving) return;
		if (
			planningSaves
				.getSnapshot()
				.some((item) => item.input.drawingId === drawing.id)
		)
			return;
		const run = request.current;
		try {
			const load = () => getVisualPlanning(siteId, drawing.id);
			const loaded = await cache.loadPlanning(drawing.id, load);
			if (run !== request.current || editingRef.current) return;
			const value = cache.peekPlanning(drawing.id) ?? loaded;
			setIndex(value);
			setError(null);
			setDraft((current) => {
				if (!current) return null;
				if (!current.id) return current;
				const selected = value.plans.find((plan) => plan.id === current.id);
				return selected ? draftFromPlan(selected) : null;
			});
		} catch {}
	}, [
		active,
		areaEditing,
		dirty,
		drawing.id,
		cache,
		saving,
		siteId,
		planningSaves,
	]);
	useEffect(() => {
		if (active && !wasActive.current) void refreshPlanning();
		wasActive.current = active;
	}, [active, refreshPlanning]);

	useEffect(() => {
		const refreshIfVisible = () => {
			if (document.visibilityState === "visible") void refreshPlanning();
		};
		if (!active) return;
		const timer = window.setInterval(refreshIfVisible, 60_000);
		window.addEventListener("focus", refreshIfVisible);
		document.addEventListener("visibilitychange", refreshIfVisible);
		return () => {
			window.clearInterval(timer);
			window.removeEventListener("focus", refreshIfVisible);
			document.removeEventListener("visibilitychange", refreshIfVisible);
		};
	}, [refreshPlanning, active]);

	useEffect(() => {
		const invalidate = (event: Event) => {
			const detail = (event as CustomEvent<{ siteId?: string }>).detail;
			if (detail?.siteId !== siteId) return;
			cache.invalidatePlanning();
			queueMicrotask(() => void refreshPlanning());
		};
		window.addEventListener(VISUAL_PLANNING_CACHE_INVALIDATED, invalidate);
		return () =>
			window.removeEventListener(VISUAL_PLANNING_CACHE_INVALIDATED, invalidate);
	}, [refreshPlanning, cache, siteId]);

	function applySavedPlan(plan: VisualPlan, close = false) {
		cache.mergePlanningPlan(drawing.id, plan);
		setIndex(cache.peekPlanning(drawing.id) ?? null);
		setDraft(close ? null : draftFromPlan(plan));
		setPlanningSession((current) => current + 1);
		setSelectedArea(null);
		setDirty(false);
		setAreaEditing(false);
	}

	function activatePlan(plan: PlanningItem, areaId?: string) {
		const planStartDay = utcDay(plan.startDate);
		setPlanningDay((current) =>
			Math.max(
				current ?? planningTimeline.lastDay ?? planStartDay,
				planStartDay,
			),
		);
		setDraft(draftFromPlan(plan));
		setPlanningSession((current) => current + 1);
		setAreaEditing(false);
		setSelectedArea(areaId ? { planId: plan.id, areaId } : null);
		setError(null);
		setNotice(null);
		setConflict(null);
	}

	function selectPlan(plan: PlanningItem, areaId?: string) {
		if (dirty || areaEditing) {
			setPendingDrawerAction({ type: "select", planId: plan.id, areaId });
			return;
		}
		activatePlan(plan, areaId);
	}

	function startNewPlan(discardChanges = false) {
		if (!index || saving) return false;
		if ((dirty || areaEditing) && !discardChanges) {
			setPendingDrawerAction({ type: "new" });
			return false;
		}
		setDraft(emptyDraft(index));
		setPlanningSession((current) => current + 1);
		setAreaEditing(false);
		setSelectedArea(null);
		setDirty(false);
		setError(null);
		setNotice(null);
		setConflict(null);
		setPendingDrawerAction(null);
		return true;
	}

	const zoneAddingDisabled =
		!index ||
		saving ||
		areaEditing ||
		!!(draft && !draft.archivedAt && draft.areas.length >= 50);
	function addZone() {
		if (zoneAddingDisabled) return;
		if (!draft || draft.archivedAt) {
			if (!startNewPlan()) return;
		} else {
			setPlanningDay((current) =>
				Math.max(current ?? utcDay(draft.startDate), utcDay(draft.startDate)),
			);
		}
		setAreaRequest((value) => value + 1);
	}

	function closeDrawer(discardChanges = false) {
		if (saving) return;
		if ((dirty || areaEditing) && !discardChanges) {
			setPendingDrawerAction({ type: "close" });
			return;
		}
		setDraft(null);
		setPlanningSession((current) => current + 1);
		setAreaEditing(false);
		setSelectedArea(null);
		setDirty(false);
		setError(null);
		setNotice(null);
		setConflict(null);
		setPendingDrawerAction(null);
	}

	function confirmDrawerAction() {
		if (!pendingDrawerAction || !index) return;
		const action = pendingDrawerAction;
		setPendingDrawerAction(null);
		if (action.type === "new") {
			if (startNewPlan(true)) setAreaRequest((value) => value + 1);
			return;
		}
		if (action.type === "close") {
			closeDrawer(true);
			return;
		}
		const plan = index.plans.find((item) => item.id === action.planId);
		if (plan) {
			setDirty(false);
			activatePlan(plan, action.areaId);
		}
	}

	function changeDraft(change: Partial<PlanningDraft>) {
		setDraft((current) => (current ? { ...current, ...change } : current));
		setDirty(true);
		setError(null);
		setNotice(null);
		setConflict(null);
	}

	function savePlan(automatic = false) {
		if (!index || !draft || saving || !dirty || draft.archivedAt || areaEditing)
			return;
		const invalid = (message: string) => {
			if (!automatic) setError(message);
		};
		const automaticQuantity = draft.automaticQuantity && isAreaUnit(draft.unit);
		if (automaticQuantity && measuredArea === null) {
			invalid(
				"Norādiet rasējuma mērogu, lai aprēķinātu laukumu, vai ievadiet apjomu manuāli.",
			);
			return;
		}
		const quantity = automaticQuantity
			? roundedArea(measuredArea ?? 0)
			: Number(draft.quantity);
		if (!draft.work || !draft.unit) {
			invalid("Izvēlieties darbu un mērvienību.");
			return;
		}
		if (!Number.isFinite(quantity) || quantity <= 0) {
			invalid("Norādiet plānoto apjomu, kas ir lielāks par nulli.");
			return;
		}
		if (!draft.startDate || !draft.endDate || draft.startDate > draft.endDate) {
			invalid("Beigu datumam jābūt vienādam ar sākuma datumu vai vēlākam.");
			return;
		}
		if (!draft.id && draft.startDate < index.today) {
			invalid("Jauna plāna sākuma datumam jābūt šodien vai nākotnē.");
			return;
		}
		if (!draft.areas.length) {
			invalid("Uzzīmējiet vismaz vienu plānoto zonu rasējumā.");
			return;
		}
		setError(null);
		setConflict(null);
		try {
			const input: VisualPlanInput = {
				siteId,
				drawingId: drawing.id,
				...(draft.id && draft.version
					? { id: draft.id, version: draft.version }
					: {}),
				work: draft.work,
				location: index.location,
				unit: draft.unit,
				quantity,
				startDate: draft.startDate,
				endDate: draft.endDate,
				contactId: draft.contactId,
				geometry: {
					version: 1,
					areas: draft.areas,
					...(automaticQuantity ? { quantitySource: "area" as const } : {}),
					...(draft.section ? { section: draft.section } : {}),
				},
			};
			const current = draft.id
				? cache
						.peekPlanning(drawing.id)
						?.plans.find((plan) => plan.id === draft.id)
				: undefined;
			if (
				current &&
				!current.geometryReviewRequired &&
				sameVisualPlanningContent(current, input)
			) {
				setDirty(false);
				return;
			}
			const plan = planningSaves.enqueue(input, automatic ? 300 : 0);
			setIndex(cache.peekPlanning(drawing.id) ?? null);
			setDraft(draftFromPlan(plan));
			setDirty(false);
			setAreaEditing(false);
			if (!automatic) setSelectedArea(null);
			setNotice("Plāns saglabāts šajā cilnē. Notiek sinhronizācija.");
		} catch {
			setError("Neizdevās saglabāt plānu. Mēģiniet vēlreiz.");
		}
	}
	const autoSave = useRef(savePlan);
	autoSave.current = savePlan;
	useEffect(() => {
		if (
			draft?.automaticQuantity &&
			isAreaUnit(draft.unit) &&
			measuredArea === null
		)
			return;
		if (draft?.id && dirty && !areaEditing && !saving && !draft.archivedAt)
			autoSave.current(true);
	}, [draft, dirty, areaEditing, saving, measuredArea]);

	async function archivePlan() {
		if (
			!draft?.id ||
			!draft.version ||
			saving ||
			planPending ||
			dirty ||
			areaEditing
		)
			return;
		setSaving(true);
		setError(null);
		try {
			const result = await archiveVisualPlanningItem({
				siteId,
				id: draft.id,
				version: draft.version,
			});
			if (!result.ok) {
				setError(result.error);
				return;
			}
			applySavedPlan(result.plan, true);
			setNotice("Plāns arhivēts. To var atjaunot arhīva sarakstā.");
		} catch {
			setError("Neizdevās arhivēt plānu.");
		} finally {
			setSaving(false);
		}
	}

	async function restorePlan() {
		if (
			!draft?.id ||
			!draft.version ||
			saving ||
			planPending ||
			!draft.archivedAt
		)
			return;
		setSaving(true);
		setError(null);
		setConflict(null);
		try {
			const result = await restoreVisualPlanningItem({
				siteId,
				id: draft.id,
				version: draft.version,
			});
			if (!result.ok) {
				setError(result.error);
				setConflict(result.conflict ?? null);
				return;
			}
			applySavedPlan(result.plan);
			setNotice("Plāns atjaunots.");
		} catch {
			setError("Neizdevās atjaunot plānu.");
		} finally {
			setSaving(false);
		}
	}

	const selectedPlan = draft?.id
		? index?.plans.find((plan) => plan.id === draft.id)
		: null;
	const timelinePlans = useMemo(
		() =>
			[
				...(index?.plans.filter((plan) => showArchived || !plan.archivedAt) ??
					[]),
			].sort(
				(left, right) =>
					left.startDate.localeCompare(right.startDate) ||
					left.endDate.localeCompare(right.endDate) ||
					left.work.localeCompare(right.work, "lv"),
			),
		[index?.plans, showArchived],
	);
	const planningTimeline = useMemo(
		() => visualPlanningTimelineRange(timelinePlans),
		[timelinePlans],
	);
	const selectedPlanningDay =
		planningTimeline.firstDay !== null && planningTimeline.lastDay !== null
			? Math.max(
					planningTimeline.firstDay,
					Math.min(
						planningDay ?? planningTimeline.lastDay,
						planningTimeline.lastDay,
					),
				)
			: null;
	const visiblePdfPlans = cumulativeVisualPlanningPlans(
		timelinePlans,
		selectedPlanningDay,
	);
	const timelineRange =
		planningTimeline.firstDay !== null && planningTimeline.lastDay !== null
			? {
					start: dateFromUtcDay(planningTimeline.firstDay),
					end: dateFromUtcDay(planningTimeline.lastDay),
				}
			: null;
	const activePlanVisible =
		!!draft &&
		(!draft.id ||
			((showArchived || !draft.archivedAt) &&
				selectedPlanningDay !== null &&
				utcDay(draft.startDate) <= selectedPlanningDay));
	const backgroundAreas = visiblePdfPlans
		.filter((plan) => plan.id !== draft?.id)
		.flatMap((plan) =>
			plan.geometry.areas.map((area) => ({
				...area,
				planId: plan.id,
				color: workColor(plan.work),
				label: plan.work,
			})),
		);
	const fixedUnit = index?.workOptions.find(
		(option) => option.work === draft?.work,
	)?.unit;
	const selectableContacts = (index?.contacts ?? []).filter(
		(contact) => !contact.archivedAt || contact.id === draft?.contactId,
	);
	const selectedWhatsAppSends = selectedPlan?.whatsAppSends ?? [];
	const pdfUrl = `${cache.endpoint(drawing.id)}?pdf=1`;
	const imagePlan = useMemo(
		() =>
			draft?.areas.length
				? {
						work: draft.work,
						location: index?.location ?? drawing.state.location,
						geometry: { version: 1 as const, areas: draft.areas },
					}
				: null,
		[draft?.work, draft?.areas, index?.location, drawing.state.location],
	);
	const imageColor = draft ? workColor(draft.work) : "";
	const imageSection =
		draft?.section &&
		index?.sectionDrawingCodes?.some(
			(code) => sectionKey(code) === sectionKey(draft.section ?? ""),
		)
			? draft.section
			: undefined;
	const imageKey = imagePlan
		? cache.planningImageKey(pdfUrl, imagePlan, imageColor, imageSection)
		: "";
	const createImages = useCallback(() => {
		if (!imagePlan)
			return Promise.reject(new Error("Plānam nav saglabātu zonu."));
		return cache.loadPlanningImages(
			pdfUrl,
			imagePlan,
			imageColor,
			imageSection,
		);
	}, [cache, pdfUrl, imagePlan, imageColor, imageSection]);
	useEffect(() => {
		if (!active || areaEditing || !imagePlan || draft?.archivedAt) return;
		const timer = window.setTimeout(() => {
			void createImages().catch(() => {});
		}, 250);
		return () => window.clearTimeout(timer);
	}, [active, areaEditing, imagePlan, draft?.archivedAt, createImages]);

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			{showSaveStatus ? (
				<VisualPlanningSaveStatus
					queue={planningSaves}
					items={planningSaveState}
					onDiscard={(id) => {
						cache.invalidatePlanning(id);
						void refreshPlanning();
					}}
				/>
			) : null}
			<div
				ref={setControlsHost}
				data-planning-controls
				className="shrink-0 border-b bg-background px-3 py-2"
			/>
			<div className="relative min-h-0 flex-1 overflow-hidden">
				<VisualPdf
					active={active}
					controlsHost={controlsHost}
					resourceCache={cache}
					fillWorkspace
					url={`/api/sites/${encodeURIComponent(siteId)}/visual/${encodeURIComponent(drawing.id)}?pdf=1`}
					marks={[]}
					selected={null}
					onSelect={() => {}}
					planning={{
						pageScales,
						onScaleChange: changeScale,
						onAreaChange: onMeasuredAreaChange,
						planId: draft?.id ?? null,
						interactionKey: `${draft ? (draft.id ?? "new") : "closed"}:${planningSession}`,
						areas: activePlanVisible ? (draft?.areas ?? []) : [],
						backgroundAreas,
						selectedArea,
						areaRequest,
						color: draft ? workColor(draft.work) : undefined,
						label: draft?.work,
						editable:
							activePlanVisible && !!draft && !saving && !draft.archivedAt,
						onChange: (areas) => {
							if (draft) changeDraft({ areas });
						},
						onEditingChange: setAreaEditing,
						onSelectArea: (selection) => {
							if (!selection) {
								setSelectedArea(null);
								return;
							}
							if (selection.planId === (draft?.id ?? null)) {
								setSelectedArea(selection);
								return;
							}
							const plan = index?.plans.find(
								(item) => item.id === selection.planId,
							);
							if (plan) selectPlan(plan, selection.areaId);
						},
					}}
				/>

				{sidebarOpen ? (
					<aside
						aria-label="Darbu plānošana"
						className="absolute inset-y-3 left-3 z-30 flex w-[min(380px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-xl border bg-background/95 shadow-xl backdrop-blur-sm"
					>
						<div className="flex items-center justify-between gap-3 border-b px-4 py-3">
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.14em] text-teal-800">
									Darbu plāns
								</p>
								<p className="text-xs text-muted-foreground">
									{index?.location}
								</p>
							</div>
							<Button
								size="sm"
								variant="outline"
								disabled={zoneAddingDisabled}
								onClick={addZone}
							>
								<Plus className="h-4 w-4" />
								Pievienot zonu
							</Button>
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto p-3">
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-3 px-1">
									<div>
										<p className="text-xs font-medium">Darbu secība</p>
										<p className="text-[11px] text-muted-foreground">
											No agrākā sākuma līdz vēlākajam
										</p>
									</div>
									<Label
										htmlFor={archiveId}
										className="flex items-center gap-2 text-xs font-normal text-muted-foreground"
									>
										<Switch
											id={archiveId}
											checked={showArchived}
											disabled={dirty || areaEditing || saving}
											onCheckedChange={(checked) => {
												setShowArchived(checked);
												if (!checked && draft?.archivedAt) closeDrawer(true);
											}}
										/>
										Arhīvs
									</Label>
								</div>
								{timelinePlans.length && timelineRange ? (
									<>
										<div
											aria-hidden="true"
											className="flex justify-between px-1 text-[10px] tabular-nums text-muted-foreground"
										>
											<span>{formatPlanDate(timelineRange.start)}</span>
											<span>{formatPlanDate(timelineRange.end)}</span>
										</div>
										<ul className="space-y-2">
											{timelinePlans.map((plan, position) => {
												const bar = visualPlanningTimelineBar(
													plan,
													timelineRange,
												);
												const color = workColor(plan.work);
												const contact = index?.contacts?.find(
													(item) => item.id === plan.contactId,
												);
												return (
													<li key={plan.id}>
														<button
															type="button"
															aria-pressed={draft?.id === plan.id}
															disabled={saving}
															className={`w-full rounded-lg border-l-4 bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${statusClasses[plan.progress.status]} ${draft?.id === plan.id ? "ring-2 ring-teal-700/30" : ""}`}
															onClick={() => selectPlan(plan)}
														>
															<span className="flex items-start gap-2.5">
																<span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
																	{String(position + 1).padStart(2, "0")}
																</span>
																<span className="min-w-0 flex-1">
																	<span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
																		<span
																			aria-hidden="true"
																			className="h-2.5 w-2.5 shrink-0 rounded-sm"
																			style={{ backgroundColor: color }}
																		/>
																		<span
																			data-plan-work-name="saved"
																			className="min-w-0 flex-1 truncate"
																		>
																			{plan.work}
																		</span>
																	</span>
																	<span className="block text-xs text-muted-foreground">
																		{formatPlanDate(plan.startDate)}–
																		{formatPlanDate(plan.endDate)}
																	</span>
																	{contact ? (
																		<span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
																			<ContactRound className="h-3 w-3" />
																			{contact.name}
																		</span>
																	) : null}
																</span>
																<span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium">
																	{plan.archivedAt
																		? "Arhivēts"
																		: statusLabels[plan.progress.status]}
																</span>
															</span>
															<span className="relative mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
																<span
																	aria-hidden="true"
																	data-plan-timeline={plan.id}
																	className="absolute inset-y-0 rounded-full"
																	style={{ ...bar, backgroundColor: color }}
																/>
															</span>
														</button>
													</li>
												);
											})}
										</ul>
									</>
								) : (
									<p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
										Šai lokācijai vēl nav saglabātu plānu. Spiediet “Pievienot
										zonu”, lai ieplānotu pirmo darbu.
									</p>
								)}
							</div>
						</div>

						{loading ? (
							<output className="absolute inset-0 flex items-center justify-center gap-2 bg-background/85 text-sm">
								<Loader2 className="h-4 w-4 animate-spin" />
								Ielādē plānus…
							</output>
						) : null}
					</aside>
				) : null}

				<aside
					aria-label="Plāna detaļas"
					aria-hidden={!draft}
					inert={!draft}
					data-state={draft ? "open" : "closed"}
					className={`absolute inset-y-3 right-3 z-40 flex w-[min(440px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-xl transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${draft ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[calc(100%+1rem)] opacity-0"}`}
					onKeyDown={(event) => {
						if (
							event.key === "Escape" &&
							!saving &&
							!event.defaultPrevented &&
							!(
								event.target instanceof Element &&
								event.target.closest('[role="dialog"]')
							)
						) {
							event.stopPropagation();
							closeDrawer();
						}
					}}
				>
					<div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
						<div className="min-w-0 flex-1 space-y-1">
							<p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
								{draft?.archivedAt
									? "Arhivētais plāns"
									: draft?.id
										? "Plāna detaļas"
										: "Jauns plāns"}
							</p>
							<p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
								<span
									aria-hidden="true"
									className="h-3 w-3 shrink-0 rounded-sm"
									style={{
										backgroundColor: draft
											? workColor(draft.work)
											: visualLayers.other.color,
									}}
								/>
								<span
									data-plan-work-name="detail"
									className="min-w-0 flex-1 truncate"
								>
									{draft?.work || "Izvēlieties darbu"}
								</span>
							</p>
							{draft ? (
								<p className="text-xs tabular-nums text-muted-foreground">
									{formatPlanDate(draft.startDate)}–
									{formatPlanDate(draft.endDate)}
								</p>
							) : null}
						</div>
						<Button
							ref={drawerCloseButton}
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8 shrink-0"
							aria-label="Aizvērt plāna detaļas"
							disabled={saving}
							onClick={() => closeDrawer()}
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					{draft && index ? (
						<form
							className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
							onSubmit={(event) => {
								event.preventDefault();
								void savePlan();
							}}
						>
							<div className="flex items-center justify-end gap-3">
								<div className="flex items-center gap-2">
									<span className="text-xs tabular-nums text-muted-foreground">
										{draft.areas.length}{" "}
										{draft.areas.length === 1 ? "zona" : "zonas"}
									</span>
									{!draft.archivedAt && !areaEditing ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="h-7"
											disabled={zoneAddingDisabled}
											onClick={addZone}
										>
											<Plus className="h-3.5 w-3.5" />
											Pievienot zonu
										</Button>
									) : null}
								</div>
							</div>

							{selectedPlan?.geometryReviewRequired ? (
								<p className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
									<TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
									PDF ir aizstāts. Pārbaudiet un vajadzības gadījumā
									pārvietojiet plānotās zonas.
								</p>
							) : null}

							<div className="space-y-2">
								<Label htmlFor={workId}>Darbs</Label>
								<Select
									value={draft.work}
									disabled={saving || !!draft.archivedAt}
									onValueChange={(work) => {
										const option = index.workOptions.find(
											(item) => item.work === work,
										);
										changeDraft({
											work,
											unit:
												option?.unit ||
												draft.unit ||
												index.unitOptions[0] ||
												"",
										});
									}}
								>
									<SelectTrigger id={workId} className="w-full min-w-0">
										<SelectValue
											className="min-w-0 flex-1 overflow-hidden text-ellipsis"
											placeholder="Izvēlieties darbu"
										/>
									</SelectTrigger>
									<SelectContent className="max-w-[calc(100vw-2rem)]">
										{index.workOptions.map((option) => (
											<SelectItem
												key={option.work}
												value={option.work}
												className="whitespace-normal"
											>
												{option.work}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
								<div className="space-y-2">
									<Label htmlFor={quantityId}>Plānotais apjoms</Label>
									<Input
										id={quantityId}
										type="number"
										min="0"
										step="any"
										value={
											draft.automaticQuantity && isAreaUnit(draft.unit)
												? measuredArea === null || measuredArea === 0
													? ""
													: roundedArea(measuredArea)
												: draft.quantity
										}
										disabled={saving || !!draft.archivedAt}
										onChange={(event) =>
											changeDraft({
												quantity: event.target.value,
												automaticQuantity: false,
											})
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor={unitId}>Mērvienība</Label>
									<Select
										value={draft.unit}
										disabled={saving || !!draft.archivedAt || !!fixedUnit}
										onValueChange={(unit) => changeDraft({ unit })}
									>
										<SelectTrigger id={unitId}>
											<SelectValue placeholder="Vienība" />
										</SelectTrigger>
										<SelectContent>
											{[...new Set([draft.unit, ...index.unitOptions])]
												.filter(Boolean)
												.map((unit) => (
													<SelectItem key={unit} value={unit}>
														{unit}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{isAreaUnit(draft.unit) ? (
								<div className="space-y-1">
									<label
										htmlFor={`${fieldId}-area-quantity`}
										className="flex items-center gap-2 text-xs"
									>
										<Switch
											id={`${fieldId}-area-quantity`}
											checked={draft.automaticQuantity}
											disabled={saving || !!draft.archivedAt}
											onCheckedChange={(automaticQuantity) =>
												changeDraft({
													automaticQuantity,
													quantity:
														!automaticQuantity && measuredArea !== null
															? String(roundedArea(measuredArea))
															: draft.quantity,
												})
											}
										/>
										Apjoms no zonas (m²)
									</label>
									{draft.automaticQuantity && measuredArea === null ? (
										<p className="text-xs text-muted-foreground">
											Laukumam vajadzīgs lapas mērogs un derīga zonas kontūra.
										</p>
									) : null}
								</div>
							) : null}
							<VisualSectionSelect
								siteId={siteId}
								value={draft.section}
								options={index.sections ?? []}
								disabled={saving || !!draft.archivedAt || areaEditing}
								onChange={(section) => changeDraft({ section })}
								onOptionsChange={(sections) => {
									const next = { ...index, sections };
									setIndex(next);
									resourceCache?.invalidatePlanning();
									resourceCache?.rememberPlanning(drawing.id, next);
								}}
							/>
							<div className="grid grid-cols-2 gap-3">
								<div className="col-span-2 space-y-2">
									<Label htmlFor={contactId}>Atbildīgais kontakts</Label>
									<Select
										value={draft.contactId ?? "unassigned"}
										disabled={saving || !!draft.archivedAt}
										onValueChange={(value) =>
											changeDraft({
												contactId: value === "unassigned" ? null : value,
											})
										}
									>
										<SelectTrigger id={contactId}>
											<SelectValue placeholder="Izvēlieties kontaktu" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="unassigned">Nav piešķirts</SelectItem>
											{selectableContacts.map((contact) => (
												<SelectItem key={contact.id} value={contact.id}>
													{contact.name} · +{contact.phone}
													{contact.archivedAt ? " (arhivēts)" : ""}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground">
										Organizācijas kontaktus un WhatsApp numurus var pārvaldīt
										sadaļā{" "}
										<Link
											href="/dashboard/settings"
											className="font-medium text-teal-800 underline-offset-4 hover:underline"
										>
											Organizācijas iestatījumi
										</Link>
										.
									</p>
								</div>
								<div className="space-y-2">
									<Label htmlFor={startId}>Sākuma datums</Label>
									<Input
										id={startId}
										type="date"
										min={draft.id ? undefined : index.today}
										value={draft.startDate}
										disabled={saving || !!draft.archivedAt}
										onChange={(event) =>
											changeDraft({ startDate: event.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor={endId}>Izpildes termiņš</Label>
									<Input
										id={endId}
										type="date"
										min={draft.startDate || index.today}
										value={draft.endDate}
										disabled={saving || !!draft.archivedAt}
										onChange={(event) =>
											changeDraft({ endDate: event.target.value })
										}
									/>
								</div>
							</div>

							<details
								open={Boolean(draft?.id && whatsAppHistoryPlanId === draft.id)}
								onToggle={(event) =>
									setWhatsAppHistoryPlanId(
										event.currentTarget.open ? (draft?.id ?? null) : null,
									)
								}
								className="group rounded-lg border bg-muted/20"
							>
								<summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-medium marker:hidden">
									<MessageCircle className="h-4 w-4 text-teal-700" />
									<span className="flex-1">WhatsApp sūtījumi</span>
									<span className="rounded-full border bg-background px-2 py-0.5 tabular-nums text-muted-foreground">
										{selectedWhatsAppSends.length}
									</span>
									<ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
								</summary>
								<section
									aria-label="WhatsApp sūtījumu vēsture"
									className="border-t p-3"
								>
									{selectedWhatsAppSends.length ? (
										<ul className="space-y-2">
											{selectedWhatsAppSends.map((send, sendIndex) => {
												const status = whatsAppSendStatus(
													send.items,
													send.status,
												);
												return (
													<li
														key={send.id}
														className="rounded-md border bg-background px-3 py-2 text-xs"
													>
														<div className="flex items-start justify-between gap-3">
															<span className="tabular-nums text-muted-foreground">
																+{send.recipient} ·{" "}
																{formatWhatsAppDateTime(send.createdAt)}
															</span>
															<span className="shrink-0 font-medium">
																{whatsAppStatusLabels[status] ?? status}
															</span>
														</div>
														<p className="mt-1 text-muted-foreground">
															{
																send.items.filter(
																	(item) => item.status === "read",
																).length
															}
															/{send.items.length} izlasīti · versija{" "}
															{send.planVersion}
														</p>
														{sendIndex === 0 ? (
															<>
																<p className="mt-2 line-clamp-3 whitespace-normal text-foreground">
																	{send.message}
																</p>
																<ul className="mt-2 flex flex-wrap gap-1.5">
																	{send.items.map((item) => (
																		<li
																			key={`${send.id}:${item.ordinal}`}
																			className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground"
																		>
																			{item.section
																				? `Sekcija ${item.section}`
																				: `PDF lapa ${item.page}`}{" "}
																			·{" "}
																			{whatsAppStatusLabels[item.status] ??
																				item.status}
																		</li>
																	))}
																</ul>
																{send.items.find(
																	(item) => item.failureReason,
																) ? (
																	<p className="mt-2 text-destructive">
																		{
																			send.items.find(
																				(item) => item.failureReason,
																			)?.failureReason
																		}
																	</p>
																) : null}
															</>
														) : null}
													</li>
												);
											})}
										</ul>
									) : (
										<p className="text-xs text-muted-foreground">
											Šim uzdevumam vēl nav WhatsApp sūtījumu.
										</p>
									)}
								</section>
							</details>

							{error ? (
								<div
									role="alert"
									className="space-y-2 text-xs text-destructive"
								>
									<p>{error}</p>
									{conflict ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() => {
												if (conflict.id === draft.id)
													planningSaves.discard(conflict.id);
												cache.mergePlanningPlan(drawing.id, conflict);
												const existing = cache
													.peekPlanning(drawing.id)
													?.plans.find((plan) => plan.id === conflict.id);
												setIndex(cache.peekPlanning(drawing.id) ?? null);
												if (existing) {
													setDraft(draftFromPlan(existing));
													setSelectedArea(null);
													setDirty(false);
													setError(null);
													setConflict(null);
												}
											}}
										>
											Atvērt esošo plānu
										</Button>
									) : null}
								</div>
							) : null}
							{notice ? (
								<output className="block text-xs text-emerald-700">
									{notice}
								</output>
							) : null}

							<div className="flex flex-wrap gap-2">
								{draft.archivedAt ? (
									<Button
										type="button"
										disabled={saving}
										onClick={() => void restorePlan()}
									>
										{saving ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<RotateCcw className="h-4 w-4" />
										)}
										Atjaunot plānu
									</Button>
								) : (
									<>
										{!draft.id ? (
											<Button
												type="submit"
												disabled={
													saving || planPending || areaEditing || !dirty
												}
											>
												{saving ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : null}
												Saglabāt plānu
											</Button>
										) : null}
										{selectedPlan ? (
											<VisualPlanningWhatsApp
												siteId={siteId}
												key={selectedPlan.id}
												plan={selectedPlan}
												imageKey={imageKey}
												initialImages={cache.peekPlanningImages(imageKey)}
												createImages={createImages}
												contact={index.contacts.find(
													(contact) => contact.id === selectedPlan.contactId,
												)}
												disabled={saving || planPending || dirty || areaEditing}
												onSendResult={(result) => {
													if (result.status === "sent")
														setWhatsAppHistoryPlanId(selectedPlan.id);
													cache.invalidatePlanning(drawing.id);
													void refreshPlanning();
												}}
											/>
										) : null}
										{dirty ? (
											<Button
												type="button"
												variant="outline"
												disabled={saving}
												onClick={() => {
													setDraft(
														selectedPlan
															? draftFromPlan(selectedPlan)
															: emptyDraft(index),
													);
													setDirty(false);
													setSelectedArea(null);
													setError(null);
												}}
											>
												Atcelt izmaiņas
											</Button>
										) : null}
										{draft.id ? (
											<Button
												type="button"
												variant="ghost"
												className="text-muted-foreground"
												disabled={saving || planPending || dirty || areaEditing}
												onClick={() => void archivePlan()}
											>
												<Archive className="h-4 w-4" />
												Arhivēt
											</Button>
										) : null}
									</>
								)}
							</div>
							{!draft.archivedAt && !selectedPlan ? (
								<p className="text-xs text-muted-foreground">
									Pirms nosūtīšanas saglabājiet plānu.
								</p>
							) : null}
						</form>
					) : null}
				</aside>
				<AlertDialog
					open={!!pendingDrawerAction}
					onOpenChange={(open) => {
						if (!open) setPendingDrawerAction(null);
					}}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Atmest nesaglabātās izmaiņas?</AlertDialogTitle>
							<AlertDialogDescription>
								Pašreizējā plāna nesaglabātās izmaiņas tiks atmestas.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Turpināt pašreizējo</AlertDialogCancel>
							<AlertDialogAction onClick={confirmDrawerAction}>
								{pendingDrawerAction?.type === "new"
									? "Atmest un sākt jaunu"
									: "Atmest un turpināt"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
			<fieldset disabled={dirty || areaEditing || saving} className="min-w-0">
				<VisualTimeline
					compact
					firstDay={planningTimeline.firstDay}
					lastDay={planningTimeline.lastDay}
					day={selectedPlanningDay}
					onChange={setPlanningDay}
					undatedCount={0}
					includeUndated={false}
					onIncludeUndated={() => {}}
					visibleCount={visiblePdfPlans.length}
					ariaLabel="Plānotie darbi pa dienām"
					title="Plānošanas datums"
					dayPrefix="Plāns līdz"
					emptyLabel="Nav saglabātu plānu"
					countLabel={(count) => `${count} darbi`}
					emptyHint="Pievienojiet plānu, lai izmantotu datumu slīdni"
					sliderLabel="Plānošanas datums"
				/>
			</fieldset>
		</div>
	);
}
