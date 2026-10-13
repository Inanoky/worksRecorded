"use client";

import {
	Archive,
	CalendarRange,
	ChevronLeft,
	ChevronRight,
	Loader2,
	Plus,
	RotateCcw,
	TriangleAlert,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
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
	saveVisualPlanningItem,
} from "./actions";
import {
	defaultVisualLayerSettings,
	resolveVisualWorkLayer,
	type VisualLayerConfiguration,
	visualLayerStyles,
} from "./layer-settings";
import { type VisualDrawing, visualLayers } from "./model";
import type { VisualPlan, VisualPlanArea } from "./planning-model";
import { VisualPdf } from "./VisualPdf";

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
	startDate: string;
	endDate: string;
	areas: VisualPlanArea[];
	archivedAt: string | null;
};

type PlanningPeriod = "week" | "month";

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

function addUtcDays(date: string, days: number) {
	const value = new Date(`${date}T00:00:00Z`);
	value.setUTCDate(value.getUTCDate() + days);
	return value.toISOString().slice(0, 10);
}

function addUtcMonths(date: string, months: number) {
	const value = new Date(`${date}T00:00:00Z`);
	const day = value.getUTCDate();
	value.setUTCDate(1);
	value.setUTCMonth(value.getUTCMonth() + months);
	const lastDay = new Date(
		Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0),
	).getUTCDate();
	value.setUTCDate(Math.min(day, lastDay));
	return value.toISOString().slice(0, 10);
}

export function visualPlanningPeriodRange(
	start: string,
	period: PlanningPeriod,
) {
	return {
		start,
		end:
			period === "week"
				? addUtcDays(start, 6)
				: addUtcDays(addUtcMonths(start, 1), -1),
	};
}

function planIntersectsPeriod(
	plan: Pick<VisualPlan, "startDate" | "endDate">,
	range: { start: string; end: string },
) {
	return plan.endDate >= range.start && plan.startDate <= range.end;
}

function utcDay(date: string) {
	return Date.parse(`${date}T00:00:00Z`) / 86_400_000;
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
		startDate,
		endDate: startDate,
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
		startDate: plan.startDate,
		endDate: plan.endDate,
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

function progressText(plan: PlanningItem) {
	if (plan.progress.dataIncomplete)
		return `Fakts nav pilnīgs · plāns ${plan.quantity} ${plan.unit}`;
	return `${plan.progress.actualQuantity ?? 0} / ${plan.quantity} ${plan.unit} · ${Math.round(plan.progress.progressPercent ?? 0)}%`;
}

export function VisualPlanningPanel({
	siteId,
	drawing,
	sidebarOpen,
	onDirtyChange,
	layerConfiguration = defaultLayerConfiguration,
}: {
	siteId: string;
	drawing: VisualDrawing;
	sidebarOpen: boolean;
	onDirtyChange: (dirty: boolean) => void;
	layerConfiguration?: VisualLayerConfiguration;
}) {
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
	const [index, setIndex] = useState<PlanningIndex | null>(null);
	const [draft, setDraft] = useState<PlanningDraft | null>(null);
	const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
	const [areaRequest, setAreaRequest] = useState(0);
	const [dirty, setDirty] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showArchived, setShowArchived] = useState(false);
	const [period, setPeriod] = useState<PlanningPeriod>("week");
	const [periodStart, setPeriodStart] = useState<string | null>(null);
	const [confirmNewPlan, setConfirmNewPlan] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [conflict, setConflict] = useState<VisualPlan | null>(null);
	const request = useRef(0);
	const fieldId = useId();
	const archiveId = `${fieldId}-archive`;
	const workId = `${fieldId}-work`;
	const quantityId = `${fieldId}-quantity`;
	const unitId = `${fieldId}-unit`;
	const startId = `${fieldId}-start`;
	const endId = `${fieldId}-end`;

	useEffect(() => {
		onDirtyChange(dirty);
	}, [dirty, onDirtyChange]);
	useEffect(
		() => () => {
			onDirtyChange(false);
		},
		[onDirtyChange],
	);
	useEffect(() => {
		const run = ++request.current;
		setLoading(true);
		setError(null);
		void getVisualPlanning(siteId, drawing.id)
			.then(
				(value) => {
					if (run !== request.current) return;
					setIndex(value);
					setPeriodStart(value.today);
					const range = visualPlanningPeriodRange(value.today, "week");
					const first = value.plans.find(
						(plan) => !plan.archivedAt && planIntersectsPeriod(plan, range),
					);
					setDraft(first ? draftFromPlan(first) : emptyDraft(value));
					setSelectedAreaId(null);
					setDirty(false);
				},
				() => {
					if (run === request.current)
						setError("Neizdevās ielādēt plānotos darbus.");
				},
			)
			.finally(() => {
				if (run === request.current) setLoading(false);
			});
		return () => {
			++request.current;
		};
	}, [drawing.id, siteId]);

	async function reload(preferredId?: string | null) {
		const value = await getVisualPlanning(siteId, drawing.id);
		setIndex(value);
		const selected = preferredId
			? value.plans.find((plan) => plan.id === preferredId)
			: undefined;
		setDraft(
			selected
				? draftFromPlan(selected)
				: emptyDraft(value, periodStart ?? value.today),
		);
		setSelectedAreaId(null);
		setDirty(false);
		return value;
	}

	function selectPlan(plan: PlanningItem) {
		if (dirty) return;
		setDraft(draftFromPlan(plan));
		setSelectedAreaId(null);
		setError(null);
		setNotice(null);
		setConflict(null);
	}

	function startNewPlan(discardChanges = false) {
		if (!index || saving) return;
		if (dirty && !discardChanges) {
			setConfirmNewPlan(true);
			return;
		}
		setDraft(emptyDraft(index, periodStart ?? index.today));
		setSelectedAreaId(null);
		setDirty(false);
		setError(null);
		setNotice(null);
		setConflict(null);
		setConfirmNewPlan(false);
	}

	function changeDraft(change: Partial<PlanningDraft>) {
		setDraft((current) => (current ? { ...current, ...change } : current));
		setDirty(true);
		setError(null);
		setNotice(null);
		setConflict(null);
	}

	async function savePlan() {
		if (!index || !draft || saving || draft.archivedAt) return;
		const quantity = Number(draft.quantity);
		if (!draft.work || !draft.unit) {
			setError("Izvēlieties darbu un mērvienību.");
			return;
		}
		if (!Number.isFinite(quantity) || quantity <= 0) {
			setError("Norādiet plānoto apjomu, kas ir lielāks par nulli.");
			return;
		}
		if (!draft.startDate || !draft.endDate || draft.startDate > draft.endDate) {
			setError("Beigu datumam jābūt vienādam ar sākuma datumu vai vēlākam.");
			return;
		}
		if (!draft.id && draft.startDate < index.today) {
			setError("Jauna plāna sākuma datumam jābūt šodien vai nākotnē.");
			return;
		}
		if (!draft.areas.length) {
			setError("Uzzīmējiet vismaz vienu plānoto zonu rasējumā.");
			return;
		}
		setSaving(true);
		setError(null);
		setConflict(null);
		try {
			const result = await saveVisualPlanningItem({
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
				geometry: { version: 1, areas: draft.areas },
			});
			if (!result.ok) {
				setError(result.error);
				setConflict(result.conflict ?? null);
				return;
			}
			await reload(result.plan.id);
			setNotice(draft.id ? "Plāns atjaunināts." : "Plāns saglabāts.");
		} catch {
			setError("Neizdevās saglabāt plānu. Mēģiniet vēlreiz.");
		} finally {
			setSaving(false);
		}
	}

	async function archivePlan() {
		if (!draft?.id || !draft.version || saving || dirty) return;
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
			await reload(null);
			setNotice("Plāns arhivēts. To var atjaunot arhīva sarakstā.");
		} catch {
			setError("Neizdevās arhivēt plānu.");
		} finally {
			setSaving(false);
		}
	}

	async function restorePlan() {
		if (!draft?.id || !draft.version || saving || !draft.archivedAt) return;
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
			await reload(result.plan.id);
			setNotice("Plāns atjaunots.");
		} catch {
			setError("Neizdevās atjaunot plānu.");
		} finally {
			setSaving(false);
		}
	}

	const range = visualPlanningPeriodRange(
		periodStart ?? index?.today ?? new Date().toISOString().slice(0, 10),
		period,
	);
	const selectedPlan = draft?.id
		? index?.plans.find((plan) => plan.id === draft.id)
		: null;
	const visiblePlans = [
		...(index?.plans.filter(
			(plan) =>
				(showArchived || !plan.archivedAt) &&
				plan.endDate >= index.today &&
				planIntersectsPeriod(plan, range),
		) ?? []),
	].sort(
		(left, right) =>
			left.startDate.localeCompare(right.startDate) ||
			left.endDate.localeCompare(right.endDate) ||
			left.work.localeCompare(right.work, "lv"),
	);
	const backgroundAreas = (index?.plans ?? [])
		.filter(
			(plan) =>
				!plan.archivedAt &&
				plan.id !== draft?.id &&
				plan.endDate >= (index?.today ?? range.start) &&
				planIntersectsPeriod(plan, range),
		)
		.flatMap((plan) =>
			plan.geometry.areas.map((area) => ({
				...area,
				id: `${plan.id}:${area.id}`,
				color: workColor(plan.work),
			})),
		);
	const fixedUnit = index?.workOptions.find(
		(option) => option.work === draft?.work,
	)?.unit;

	return (
		<div className="relative h-full min-h-0 overflow-hidden">
			<VisualPdf
				fillWorkspace
				url={`/api/sites/${encodeURIComponent(siteId)}/visual/${encodeURIComponent(drawing.id)}?pdf=1`}
				marks={[]}
				selected={null}
				onSelect={() => {}}
				planning={
					draft
						? {
								areas: draft.areas,
								backgroundAreas,
								selectedAreaId,
								areaRequest,
								color: workColor(draft.work),
								editable: !saving && !draft.archivedAt,
								onChange: (areas) => changeDraft({ areas }),
								onSelectArea: setSelectedAreaId,
							}
						: undefined
				}
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
							<p className="text-xs text-muted-foreground">{index?.location}</p>
						</div>
						<Button
							size="sm"
							variant="outline"
							disabled={!index || saving}
							onClick={() => startNewPlan()}
						>
							<Plus className="h-4 w-4" />
							Pievienot jaunu
						</Button>
					</div>

					<div className="space-y-2 border-b px-4 py-3">
						<div className="flex items-center gap-2">
							<fieldset className="flex flex-1 rounded-lg bg-muted p-0.5">
								<legend className="sr-only">Plānošanas periods</legend>
								{(["week", "month"] as const).map((value) => (
									<Button
										key={value}
										type="button"
										size="sm"
										variant={period === value ? "outline" : "ghost"}
										className="h-7 flex-1 text-xs shadow-none"
										aria-pressed={period === value}
										disabled={dirty || saving}
										onClick={() => {
											setPeriod(value);
											if (index)
												setDraft(emptyDraft(index, periodStart ?? index.today));
										}}
									>
										{value === "week" ? "Nedēļa" : "Mēnesis"}
									</Button>
								))}
							</fieldset>
							<Button
								type="button"
								size="icon"
								variant="outline"
								className="h-8 w-8"
								aria-label="Iepriekšējais periods"
								disabled={
									dirty ||
									saving ||
									!index ||
									(periodStart ?? index.today) <= index.today
								}
								onClick={() => {
									if (!index || !periodStart) return;
									const candidate =
										period === "week"
											? addUtcDays(periodStart, -7)
											: addUtcMonths(periodStart, -1);
									const previous =
										candidate < index.today ? index.today : candidate;
									setPeriodStart(previous);
									setDraft(emptyDraft(index, previous));
								}}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								size="icon"
								variant="outline"
								className="h-8 w-8"
								aria-label="Nākamais periods"
								disabled={dirty || saving || !index}
								onClick={() => {
									if (!index || !periodStart) return;
									const next =
										period === "week"
											? addUtcDays(periodStart, 7)
											: addUtcMonths(periodStart, 1);
									setPeriodStart(next);
									setDraft(emptyDraft(index, next));
								}}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
						<p className="text-xs tabular-nums text-muted-foreground">
							{formatPlanDate(range.start)}–{formatPlanDate(range.end)}
						</p>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto">
						<div className="space-y-2 border-b p-3">
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
										onCheckedChange={setShowArchived}
									/>
									Arhīvs
								</Label>
							</div>
							{visiblePlans.length ? (
								<>
									<div
										aria-hidden="true"
										className="flex justify-between px-1 text-[10px] tabular-nums text-muted-foreground"
									>
										<span>{formatPlanDate(range.start)}</span>
										<span>{formatPlanDate(range.end)}</span>
									</div>
									<ul className="space-y-2">
										{visiblePlans.map((plan, position) => {
											const bar = visualPlanningTimelineBar(plan, range);
											const color = workColor(plan.work);
											return (
												<li key={plan.id}>
													<button
														type="button"
														aria-pressed={draft?.id === plan.id}
														disabled={dirty || saving}
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
																	<span className="truncate">{plan.work}</span>
																</span>
																<span className="block text-xs text-muted-foreground">
																	{formatPlanDate(plan.startDate)}–
																	{formatPlanDate(plan.endDate)}
																</span>
															</span>
															<span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium">
																{plan.archivedAt
																	? "Arhivēts"
																	: statusLabels[plan.progress.status]}
															</span>
														</span>
														<span className="mt-1 block text-xs text-foreground">
															{progressText(plan)}
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
									Šajā nākotnes periodā vēl nav saglabātu plānu. Izvēlieties
									darbu un uzzīmējiet pirmo zonu.
								</p>
							)}
						</div>

						{draft && index ? (
							<form
								className="space-y-4 p-4"
								onSubmit={(event) => {
									event.preventDefault();
									void savePlan();
								}}
							>
								<div className="flex items-center justify-between gap-3">
									<h4 className="text-sm font-semibold">
										{draft.archivedAt
											? "Arhivētais plāns"
											: draft.id
												? "Labot plānu"
												: "Jauns plāns"}
									</h4>
									<div className="flex items-center gap-2">
										<span className="text-xs tabular-nums text-muted-foreground">
											{draft.areas.length}{" "}
											{draft.areas.length === 1 ? "zona" : "zonas"}
										</span>
										{!draft.archivedAt ? (
											<Button
												type="button"
												size="sm"
												variant="outline"
												className="h-7"
												disabled={saving || draft.areas.length >= 50}
												onClick={() => setAreaRequest((value) => value + 1)}
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
										<SelectTrigger id={workId}>
											<SelectValue placeholder="Izvēlieties darbu" />
										</SelectTrigger>
										<SelectContent>
											{index.workOptions.map((option) => (
												<SelectItem key={option.work} value={option.work}>
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
											value={draft.quantity}
											disabled={saving || !!draft.archivedAt}
											onChange={(event) =>
												changeDraft({ quantity: event.target.value })
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

								<div className="grid grid-cols-2 gap-3">
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

								<p className="flex items-center gap-2 rounded-lg border border-dashed border-teal-300 bg-teal-50/60 p-3 text-xs text-teal-950">
									<CalendarRange className="h-4 w-4 shrink-0" />
									{draft.areas.length
										? "Zonas var pārvietot un precizēt tieši rasējumā."
										: "Izvēlieties “Pievienot zonu”, pēc tam pārvietojiet zonu un tās stūrus rasējumā."}
								</p>

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
													const existing = index.plans.find(
														(plan) => plan.id === conflict.id,
													);
													if (existing) {
														setDraft(draftFromPlan(existing));
														setSelectedAreaId(null);
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
											<Button type="submit" disabled={saving || !dirty}>
												{saving ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : null}
												{draft.id ? "Saglabāt izmaiņas" : "Saglabāt plānu"}
											</Button>
											{dirty ? (
												<Button
													type="button"
													variant="outline"
													disabled={saving}
													onClick={() => {
														setDraft(
															selectedPlan
																? draftFromPlan(selectedPlan)
																: emptyDraft(index, periodStart ?? index.today),
														);
														setDirty(false);
														setSelectedAreaId(null);
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
													disabled={saving || dirty}
													onClick={() => void archivePlan()}
												>
													<Archive className="h-4 w-4" />
													Arhivēt
												</Button>
											) : null}
										</>
									)}
								</div>
							</form>
						) : null}
					</div>

					{loading ? (
						<output className="absolute inset-0 flex items-center justify-center gap-2 bg-background/85 text-sm">
							<Loader2 className="h-4 w-4 animate-spin" />
							Ielādē plānus…
						</output>
					) : null}
				</aside>
			) : null}
			<AlertDialog open={confirmNewPlan} onOpenChange={setConfirmNewPlan}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Sākt jaunu plānu?</AlertDialogTitle>
						<AlertDialogDescription>
							Pašreizējā plāna nesaglabātās izmaiņas tiks atmestas.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Turpināt pašreizējo</AlertDialogCancel>
						<AlertDialogAction onClick={() => startNewPlan(true)}>
							Atmest un sākt jaunu
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
