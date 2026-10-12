"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	loadConstructionDiaryPlans,
	loadConstructionWeek,
	saveConstructionPlanBatch,
} from "@/server/actions/construction-planner";
import {
	addDays,
	dateSchema,
	type Plan,
	planMatchKey,
	plannerToday,
	planSchema,
	weekStart,
} from "./model";
import { WeeklyPdfExport } from "./WeeklyPdfExport";

type Week = Awaited<ReturnType<typeof loadConstructionWeek>>;
const EMPTY_DIARY_ROWS: Awaited<ReturnType<typeof loadConstructionDiaryPlans>> =
	[];
type Draft = {
	id?: string;
	version?: number;
	date: string;
	work: string;
	location: string;
	unit: string;
	quantity: string;
};
const emptyDraft = (date: string): Draft => ({
	date,
	work: "",
	location: "",
	unit: "",
	quantity: "",
});
const visualPlanStatus = {
	scheduled: "Plānots",
	active: "Notiek",
	completed: "Izpildīts",
	overdue: "Kavējas",
} as const;
const visualPlanTone = {
	scheduled: "border-slate-300",
	active: "border-teal-500",
	completed: "border-emerald-500",
	overdue: "border-amber-500",
} as const;

export function useConstructionPlanner(
	siteId: string | null,
	enabled: boolean,
	refreshKey: unknown,
) {
	const [open, setOpen] = useState(false);
	const [show, setShowValue] = useState(false);
	const [dayOverrides, setDayOverrides] = useState<Record<string, boolean>>({});
	const [diary, setDiary] = useState<{
		siteId: string;
		rows: Awaited<ReturnType<typeof loadConstructionDiaryPlans>>;
	} | null>(null);
	const [diaryLoading, setDiaryLoading] = useState(false);
	const [diaryError, setDiaryError] = useState("");
	const diarySequence = useRef(0);
	const showAny = show || Object.values(dayOverrides).some(Boolean);
	const setShow = (value: boolean) => {
		setShowValue(value);
		setDayOverrides({});
	};
	const reloadDiary = useCallback(async () => {
		if (!siteId || !enabled) return;
		const request = ++diarySequence.current;
		setDiaryLoading(true);
		setDiaryError("");
		try {
			const result = await loadConstructionDiaryPlans(siteId);
			if (request === diarySequence.current) setDiary({ siteId, rows: result });
		} catch (cause) {
			if (request === diarySequence.current)
				setDiaryError(
					cause instanceof Error ? cause.message : "Neizdevās ielādēt plānu.",
				);
		} finally {
			if (request === diarySequence.current) setDiaryLoading(false);
		}
	}, [siteId, enabled]);
	useEffect(() => {
		void refreshKey;
		void reloadDiary();
		return () => {
			diarySequence.current++;
		};
	}, [reloadDiary, refreshKey]);
	const [week, setWeek] = useState(() => weekStart(plannerToday()));
	const [data, setData] = useState<(Week & { siteId: string }) | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const sequence = useRef(0);
	const active = enabled && open;
	const reload = useCallback(async () => {
		if (!siteId || !active) return;
		const request = ++sequence.current;
		setLoading(true);
		setError("");
		setData(null);
		try {
			const result = await loadConstructionWeek(siteId, week);
			if (request === sequence.current) setData({ ...result, siteId });
		} catch (cause) {
			if (request === sequence.current)
				setError(
					cause instanceof Error ? cause.message : "Neizdevās ielādēt plānu.",
				);
		} finally {
			if (request === sequence.current) setLoading(false);
		}
	}, [siteId, active, week]);
	useEffect(() => {
		void refreshKey;
		void reload();
		return () => {
			sequence.current++;
		};
	}, [reload, refreshKey]);
	return {
		siteId,
		open,
		setOpen,
		show,
		setShow,
		showAny,
		showDay: (date: string) => enabled && (dayOverrides[date] ?? show),
		setShowDay: (date: string, value: boolean) =>
			setDayOverrides((current) => ({ ...current, [date]: value })),
		diaryRows:
			enabled && diary?.siteId === siteId ? diary.rows : EMPTY_DIARY_ROWS,
		diaryLoading,
		diaryError,
		week,
		setWeek,
		data: data?.siteId === siteId && data.start === week ? data : null,
		loading,
		error,
		reload: async () => {
			await Promise.all([reload(), reloadDiary()]);
		},
	};
}
type Planner = ReturnType<typeof useConstructionPlanner>;

function WeekPicker({
	planner,
	disabled = false,
}: {
	planner: Planner;
	disabled?: boolean;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button
				type="button"
				variant="outline"
				disabled={disabled}
				onClick={() => planner.setWeek(addDays(planner.week, -7))}
				aria-label="Iepriekšējā nedēļa"
			>
				←
			</Button>
			<Input
				type="date"
				aria-label="Plāna nedēļa"
				className="w-40"
				disabled={disabled}
				value={planner.week}
				onChange={(event) => {
					if (dateSchema.safeParse(event.target.value).success)
						planner.setWeek(weekStart(event.target.value));
				}}
			/>
			<span className="text-sm">– {addDays(planner.week, 6)}</span>
			<Button
				type="button"
				variant="outline"
				disabled={disabled}
				onClick={() => planner.setWeek(addDays(planner.week, 7))}
				aria-label="Nākamā nedēļa"
			>
				→
			</Button>
		</div>
	);
}

export function PlannerControls({
	planner,
	organizationLanguage,
	onCatalogChanged,
	onShow,
}: {
	planner: Planner;
	organizationLanguage?: string | null;
	onCatalogChanged: () => void;
	onShow: () => void;
}) {
	const id = useId();
	return (
		<>
			<Button variant="outline" onClick={() => planner.setOpen(true)}>
				Plāns
			</Button>
			{planner.siteId ? (
				<WeeklyPdfExport
					siteId={planner.siteId}
					organizationLanguage={organizationLanguage}
				/>
			) : null}
			<label
				htmlFor={`${id}-show`}
				className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
			>
				<Checkbox
					id={`${id}-show`}
					checked={planner.show}
					onCheckedChange={(checked) => {
						planner.setShow(checked === true);
						if (checked === true) onShow();
					}}
				/>
				Rādīt plānu
			</label>
			<Dialog open={planner.open} onOpenChange={planner.setOpen}>
				{planner.open ? (
					<PlanEditor
						key={`${planner.siteId}:${planner.week}`}
						planner={planner}
						onCatalogChanged={onCatalogChanged}
					/>
				) : null}
			</Dialog>
		</>
	);
}

function PlanEditor({
	planner,
	onCatalogChanged,
}: {
	planner: Planner;
	onCatalogChanged: () => void;
}) {
	const id = useId();
	const today = planner.data?.today ?? plannerToday();
	const firstEditable = planner.week > today ? planner.week : addDays(today, 1);
	const [draft, setDraft] = useState<Draft>(() =>
		emptyDraft(
			firstEditable <= addDays(planner.week, 6) ? firstEditable : planner.week,
		),
	);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [dirty, setDirty] = useState(false);
	const [baseline, setBaseline] = useState<Week | null>(null);
	const [changes, setChanges] = useState<Record<string, Plan>>({});
	const [deleted, setDeleted] = useState<Plan[]>([]);
	const data = baseline ?? planner.data;
	const pending =
		dirty || Object.keys(changes).length > 0 || deleted.length > 0;
	const plans = (data?.plans ?? [])
		.filter((plan) => !deleted.some((row) => row.id === plan.id))
		.map((plan) => changes[plan.id] ?? plan)
		.concat(
			Object.values(changes).filter((plan) => plan.id.startsWith("local:")),
		)
		.sort((a, b) => a.date.localeCompare(b.date));
	const working = useRef(false);
	const locked = draft.date <= today;
	const options = {
		works: Array.from(
			new Map([
				...(data?.options.works ?? []).map((row) => [row.work, row] as const),
				...plans.map(
					(row) => [row.work, { work: row.work, unit: row.unit }] as const,
				),
			]).values(),
		),
		locations: Array.from(
			new Set([
				...(data?.options.locations ?? []),
				...plans.map((row) => row.location),
			]),
		),
		units: Array.from(
			new Set([
				...(data?.options.units ?? []),
				...plans.map((row) => row.unit),
			]),
		),
	};
	const update = (field: keyof Draft, value: string) => {
		setBaseline((current) => current ?? planner.data);
		setDirty(true);
		setError("");
		const selectedUnit =
			field === "work"
				? options?.works.find((row) => row.work === value)?.unit
				: undefined;
		setDraft((current) => ({
			...current,
			[field]: value,
			...(selectedUnit ? { unit: selectedUnit } : {}),
		}));
	};
	useEffect(() => {
		if (!pending && !busy) return;
		const warn = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [pending, busy]);
	const reset = () => {
		setDraft(
			emptyDraft(
				firstEditable <= addDays(planner.week, 6)
					? firstEditable
					: planner.week,
			),
		);
		setDirty(false);
		setError("");
	};
	const discard = () => {
		setChanges({});
		setDeleted([]);
		setBaseline(null);
		reset();
	};
	function stage() {
		const parsed = planSchema
			.omit({ siteId: true, id: true, version: true })
			.safeParse({
				date: draft.date,
				work: draft.work,
				location: draft.location,
				unit: draft.unit,
				quantity: Number(draft.quantity.trim().replace(",", ".")),
			});
		if (
			!parsed.success ||
			locked ||
			draft.date < planner.week ||
			draft.date > addDays(planner.week, 6)
		) {
			setError(
				"Pārbaudiet nākotnes datumu, darbu, vietu, mērvienību un pozitīvu daudzumu.",
			);
			return null;
		}
		const row = {
			...parsed.data,
			id: draft.id ?? `local:${crypto.randomUUID()}`,
			version: draft.version ?? 1,
		};
		if (
			plans.some(
				(plan) =>
					plan.id !== row.id &&
					plan.date === row.date &&
					planMatchKey(plan.work, plan.location, plan.unit) ===
						planMatchKey(row.work, row.location, row.unit),
			)
		) {
			setError(
				"Šis darbs, vieta un mērvienība šajā datumā jau ir plānā. Rediģējiet esošo rindu.",
			);
			return null;
		}
		return { ...changes, [row.id]: row };
	}
	function applyDraft() {
		const next = stage();
		if (!next) return;
		setChanges(next);
		reset();
	}
	async function save() {
		if (working.current || !pending || !planner.siteId) return;
		const next = dirty ? stage() : changes;
		if (!next) return;
		working.current = true;
		setBusy(true);
		setError("");
		try {
			const result = await saveConstructionPlanBatch({
				siteId: planner.siteId,
				week: planner.week,
				changes: Object.values(next).map(({ id: rowId, version, ...row }) => ({
					...row,
					...(rowId.startsWith("local:") ? {} : { id: rowId, version }),
				})),
				deleted: deleted.map(({ id: rowId, version }) => ({
					id: rowId,
					version,
				})),
			});
			if (!result.ok) setError(result.error);
			else {
				await planner.reload();
				discard();
				onCatalogChanged();
			}
		} catch {
			setError("Neizdevās saglabāt. Mēģiniet vēlreiz.");
		} finally {
			working.current = false;
			setBusy(false);
		}
	}
	function remove(plan: Plan) {
		if (working.current || plan.date <= today) return;
		setBaseline((current) => current ?? planner.data);
		setChanges((current) => {
			const next = { ...current };
			delete next[plan.id];
			return next;
		});
		if (!plan.id.startsWith("local:"))
			setDeleted((current) => [...current, plan]);
		if (draft.id === plan.id) reset();
		setError("");
	}
	return (
		<DialogContent
			className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl"
			showCloseButton={!busy && !pending}
			onPointerDownOutside={(event) => {
				if (busy || pending) event.preventDefault();
			}}
			onEscapeKeyDown={(event) => {
				if (busy || pending) event.preventDefault();
			}}
		>
			<DialogHeader>
				<DialogTitle>Nedēļas darbu plāns</DialogTitle>
				<DialogDescription>
					Plānojiet darbus pa dienām. Šodiena un pagātne ir bloķēta
					(Europe/Riga). Jauni darbi, vietas un mērvienības pēc saglabāšanas būs
					pieejami izvēlnēs. Visas izmaiņas tiks saglabātas tikai pēc pogas
					“Saglabāt” nospiešanas.
				</DialogDescription>
			</DialogHeader>
			<WeekPicker planner={planner} disabled={busy || pending} />
			{planner.loading ? <output>Ielādē plānu…</output> : null}
			{planner.error ? (
				<p role="alert" className="text-destructive">
					{planner.error}{" "}
					<Button
						variant="outline"
						disabled={busy || pending}
						onClick={() => void planner.reload()}
					>
						Mēģināt vēlreiz
					</Button>
				</p>
			) : null}
			{data ? (
				<>
					<div className="space-y-2">
						{plans.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Šai nedēļai nav plāna.
							</p>
						) : (
							plans.map((plan) => (
								<div
									key={plan.id}
									className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
								>
									<span className="min-w-0 break-words">
										{plan.date} · {plan.location} · {plan.work} ·{" "}
										{plan.quantity} {plan.unit}
										{changes[plan.id] ? (
											<span className="ml-2 text-muted-foreground">
												Nesaglabāts
											</span>
										) : null}
									</span>
									{plan.date <= today ? (
										<span className="text-muted-foreground">Bloķēts</span>
									) : (
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												disabled={busy || dirty}
												onClick={() => {
													setDraft({
														...plan,
														quantity: String(plan.quantity),
													});
													setError("");
												}}
											>
												Rediģēt
											</Button>
											<Button
												variant="outline"
												size="sm"
												disabled={busy || dirty}
												onClick={() => void remove(plan)}
											>
												Dzēst
											</Button>
										</div>
									)}
								</div>
							))
						)}
					</div>
					{data.visualPlans?.length ? (
						<section
							aria-label="Rasējuma plāni šajā nedēļā"
							className="space-y-2 rounded-lg border border-dashed border-teal-700/40 bg-teal-50/30 p-3 dark:bg-teal-950/10"
						>
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<div>
									<h3 className="text-sm font-medium">Rasējuma plāni</h3>
									<p className="text-xs text-muted-foreground">
										Periodi, kas skar izvēlēto nedēļu. Rediģējiet zonas
										Izpildshēmu skatā.
									</p>
								</div>
								<a
									href={`/dashboard/sites/${planner.siteId}/izpildshemas`}
									className="text-xs font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
								>
									Atvērt izpildshēmas
								</a>
							</div>
							<div className="grid gap-2 sm:grid-cols-2">
								{data.visualPlans.map((plan) => (
									<article
										key={plan.id}
										className={`rounded-md border-l-4 bg-background p-3 text-sm ${visualPlanTone[plan.progress.status]}`}
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="truncate font-medium">{plan.work}</p>
												<p className="text-xs text-muted-foreground">
													{plan.location} · {plan.startDate}–{plan.endDate}
												</p>
											</div>
											<span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium">
												{visualPlanStatus[plan.progress.status]}
											</span>
										</div>
										<p className="mt-2 tabular-nums">
											{plan.progress.dataIncomplete
												? `Faktiskais apjoms nav pilnīgs · plāns ${plan.quantity} ${plan.unit}`
												: `${plan.progress.actualQuantity ?? 0} / ${plan.quantity} ${plan.unit} · ${Math.round(plan.progress.progressPercent ?? 0)}%`}
										</p>
										{plan.geometryReviewRequired ? (
											<p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-300">
												Pēc PDF maiņas jāpārbauda zonas
											</p>
										) : null}
									</article>
								))}
							</div>
						</section>
					) : null}
					<form
						className="space-y-3 border-t pt-4"
						onSubmit={(event) => {
							event.preventDefault();
							applyDraft();
						}}
					>
						<h3 className="font-medium">
							{draft.id ? "Rediģēt plāna rindu" : "Pievienot plāna rindu"}
						</h3>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
							<label htmlFor={`${id}-date`} className="space-y-1 text-sm">
								Datums
								<Input
									id={`${id}-date`}
									type="date"
									required
									min={planner.week > today ? planner.week : addDays(today, 1)}
									max={addDays(planner.week, 6)}
									value={draft.date}
									disabled={busy}
									onChange={(event) => update("date", event.target.value)}
								/>
							</label>
							<label htmlFor={`${id}-work`} className="space-y-1 text-sm">
								Darbs
								<Input
									id={`${id}-work`}
									required
									list={`${id}-works`}
									maxLength={200}
									value={draft.work}
									disabled={busy || locked}
									onChange={(event) => update("work", event.target.value)}
									placeholder="Izvēlieties vai ievadiet"
								/>
							</label>
							<label htmlFor={`${id}-location`} className="space-y-1 text-sm">
								Lokācija
								<Input
									id={`${id}-location`}
									required
									list={`${id}-locations`}
									maxLength={200}
									value={draft.location}
									disabled={busy || locked}
									onChange={(event) => update("location", event.target.value)}
									placeholder="Izvēlieties vai ievadiet"
								/>
							</label>
							<label htmlFor={`${id}-unit`} className="space-y-1 text-sm">
								Mērvienība
								<Input
									id={`${id}-unit`}
									required
									list={`${id}-units`}
									maxLength={40}
									value={draft.unit}
									disabled={busy || locked}
									onChange={(event) => update("unit", event.target.value)}
									placeholder="Izvēlieties vai ievadiet"
								/>
							</label>
							<label htmlFor={`${id}-quantity`} className="space-y-1 text-sm">
								Daudzums (plāns)
								<Input
									id={`${id}-quantity`}
									required
									inputMode="decimal"
									value={draft.quantity}
									disabled={busy || locked}
									onChange={(event) => update("quantity", event.target.value)}
								/>
							</label>
						</div>
						<datalist id={`${id}-works`}>
							{options?.works.map((row) => (
								<option key={row.work} value={row.work} />
							))}
						</datalist>
						<datalist id={`${id}-locations`}>
							{options?.locations.map((value) => (
								<option key={value} value={value} />
							))}
						</datalist>
						<datalist id={`${id}-units`}>
							{options?.units.map((value) => (
								<option key={value} value={value} />
							))}
						</datalist>
						{locked ? (
							<p className="text-sm text-muted-foreground">
								Šodienas un pagātnes plāns nav rediģējams. Izvēlieties nākotnes
								datumu.
							</p>
						) : null}
						{error ? (
							<p role="alert" className="text-sm text-destructive">
								{error}
							</p>
						) : null}
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								disabled={busy}
								onClick={reset}
							>
								Notīrīt formu
							</Button>
							<Button type="submit" disabled={busy || locked || !dirty}>
								{draft.id ? "Piemērot izmaiņas" : "Pievienot plānam"}
							</Button>
						</div>
					</form>
				</>
			) : null}
			{pending ? (
				<output className="text-sm text-muted-foreground">
					Ir nesaglabātas izmaiņas
					{deleted.length ? ` · Dzēšanai: ${deleted.length}` : ""}. Pirms
					nedēļas maiņas saglabājiet vai atceliet izmaiņas.
				</output>
			) : null}
			<div className="flex justify-end gap-2 border-t pt-4">
				<Button variant="outline" disabled={busy || !pending} onClick={discard}>
					Atcelt izmaiņas
				</Button>
				<Button disabled={busy || !pending} onClick={() => void save()}>
					{busy ? "Saglabā…" : "Saglabāt"}
				</Button>
			</div>
			<Button
				variant="outline"
				disabled={busy || pending}
				onClick={() => planner.setOpen(false)}
			>
				Aizvērt
			</Button>
		</DialogContent>
	);
}
