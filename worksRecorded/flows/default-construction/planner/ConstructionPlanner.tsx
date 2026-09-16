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
	deleteConstructionPlan,
	loadConstructionDiaryPlans,
	loadConstructionWeek,
	saveConstructionPlan,
} from "@/server/actions/construction-planner";
import {
	addDays,
	dateSchema,
	type Plan,
	plannerToday,
	weekStart,
} from "./model";

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
	onCatalogChanged,
	onShow,
}: {
	planner: Planner;
	onCatalogChanged: () => void;
	onShow: () => void;
}) {
	const id = useId();
	return (
		<>
			<Button variant="outline" onClick={() => planner.setOpen(true)}>
				Plāns
			</Button>
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
	const working = useRef(false);
	const locked = draft.date <= today;
	const options = planner.data?.options;
	const update = (field: keyof Draft, value: string) => {
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
		if (!dirty && !busy) return;
		const warn = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty, busy]);
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
	async function save() {
		if (working.current || locked || !planner.siteId) return;
		const number = draft.quantity.trim().replace(",", ".");
		if (!/^\d+(\.\d+)?$/.test(number) || Number(number) <= 0) {
			setError("Norādiet pozitīvu plānoto daudzumu.");
			return;
		}
		working.current = true;
		setBusy(true);
		setError("");
		try {
			const result = await saveConstructionPlan({
				...draft,
				siteId: planner.siteId,
				quantity: Number(number),
			});
			if (!result.ok) setError(result.error);
			else {
				reset();
				await planner.reload();
				onCatalogChanged();
			}
		} catch {
			setError("Neizdevās saglabāt. Mēģiniet vēlreiz.");
		} finally {
			working.current = false;
			setBusy(false);
		}
	}
	async function remove(plan: Plan) {
		if (
			working.current ||
			!planner.siteId ||
			!window.confirm("Dzēst šo plāna rindu?")
		)
			return;
		working.current = true;
		setBusy(true);
		setError("");
		try {
			const result = await deleteConstructionPlan({
				siteId: planner.siteId,
				id: plan.id,
				version: plan.version,
			});
			if (!result.ok) setError(result.error);
			else {
				reset();
				await planner.reload();
			}
		} catch {
			setError("Neizdevās dzēst plānu.");
		} finally {
			working.current = false;
			setBusy(false);
		}
	}
	return (
		<DialogContent
			className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl"
			showCloseButton={!busy && !dirty}
			onPointerDownOutside={(event) => {
				if (busy || dirty) event.preventDefault();
			}}
			onEscapeKeyDown={(event) => {
				if (busy || dirty) event.preventDefault();
			}}
		>
			<DialogHeader>
				<DialogTitle>Nedēļas darbu plāns</DialogTitle>
				<DialogDescription>
					Plānojiet darbus pa dienām. Šodiena un pagātne ir bloķēta
					(Europe/Riga). Jauni darbi, vietas un mērvienības pēc saglabāšanas būs
					pieejami izvēlnēs.
				</DialogDescription>
			</DialogHeader>
			<WeekPicker planner={planner} disabled={busy || dirty} />
			{planner.loading ? <output>Ielādē plānu…</output> : null}
			{planner.error ? (
				<p role="alert" className="text-destructive">
					{planner.error}{" "}
					<Button variant="outline" onClick={() => void planner.reload()}>
						Mēģināt vēlreiz
					</Button>
				</p>
			) : null}
			{planner.data ? (
				<>
					<div className="space-y-2">
						{planner.data.plans.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Šai nedēļai nav plāna.
							</p>
						) : (
							planner.data.plans.map((plan) => (
								<div
									key={plan.id}
									className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
								>
									<span className="min-w-0 break-words">
										{plan.date} · {plan.location} · {plan.work} ·{" "}
										{plan.quantity} {plan.unit}
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
					<form
						className="space-y-3 border-t pt-4"
						onSubmit={(event) => {
							event.preventDefault();
							void save();
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
								Atcelt izmaiņas
							</Button>
							<Button type="submit" disabled={busy || locked || !dirty}>
								{busy ? "Saglabā…" : "Saglabāt"}
							</Button>
						</div>
					</form>
				</>
			) : null}
			<Button
				variant="outline"
				disabled={busy || dirty}
				onClick={() => planner.setOpen(false)}
			>
				Aizvērt
			</Button>
		</DialogContent>
	);
}
