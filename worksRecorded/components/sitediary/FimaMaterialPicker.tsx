"use client";

import {
	memo,
	useCallback,
	useDeferredValue,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getFimaBisRecordUrl } from "@/lib/fima/bis-record-links";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import { cn } from "@/lib/utils/utils";
import {
	refreshFimaBisMaterials,
	saveFimaDiaryCollaboration,
} from "@/server/actions/fima-diary-collaboration";
import { useFimaWarehouseAvailability } from "./FimaWarehouseProvider";

type Option = {
	id: string;
	label: string;
	unit: string;
	availableQuantity: number | null;
};
type Props = {
	siteId: string;
	recordId: string;
	state: FimaCollaboration;
	onChange: (id: string, state: FimaCollaboration) => void;
	onClose: () => void;
	onSavingChange: (saving: boolean) => void;
};
const quantity = new Intl.NumberFormat("lv-LV", { maximumFractionDigits: 6 });
const parseQuantity = (value: string) => Number(value.trim().replace(",", "."));
const errorMessage = (cause: unknown) =>
	cause instanceof Error ? cause.message : "Neizdevās saglabāt materiālus.";

const MaterialRow = memo(function MaterialRow({
	material,
	value,
	error,
	busy,
	inputId,
	onToggle,
	onQuantity,
}: {
	material: Option;
	value: string | undefined;
	error: string;
	busy: boolean;
	inputId: string;
	onToggle: (material: Option, checked: boolean) => void;
	onQuantity: (material: Option, value: string) => void;
}) {
	const selected = value !== undefined;
	return (
		<TableRow className={cn(selected && "bg-primary/5 hover:bg-primary/10")}>
			<TableCell className="align-top">
				<Checkbox
					id={inputId}
					checked={selected}
					disabled={busy || (!selected && material.availableQuantity === null)}
					aria-label={`Atlasīt: ${material.label}`}
					onCheckedChange={(checked) => onToggle(material, checked === true)}
				/>
			</TableCell>
			<TableCell className="whitespace-normal align-top">
				<label
					htmlFor={inputId}
					className="block cursor-pointer text-sm leading-relaxed"
				>
					{material.label}
				</label>
				{error ? (
					<p id={`${inputId}-error`} className="mt-1 text-xs text-destructive">
						{error}
					</p>
				) : null}
			</TableCell>
			<TableCell className="align-top text-right tabular-nums">
				<span
					className={cn(
						material.availableQuantity === null && "text-muted-foreground",
					)}
				>
					{material.availableQuantity === null
						? "—"
						: quantity.format(material.availableQuantity)}
				</span>
			</TableCell>
			<TableCell className="align-top">
				<Input
					aria-label={`Daudzums: ${material.label}`}
					aria-invalid={Boolean(error)}
					aria-describedby={error ? `${inputId}-error` : undefined}
					inputMode="decimal"
					type="text"
					autoComplete="off"
					placeholder="0"
					value={value ?? ""}
					disabled={busy || (!selected && material.availableQuantity === null)}
					className="h-9 min-w-0 text-right tabular-nums"
					onChange={(event) => onQuantity(material, event.target.value)}
				/>
			</TableCell>
			<TableCell className="align-top text-xs text-muted-foreground">
				{material.unit}
			</TableCell>
		</TableRow>
	);
});

export function FimaMaterialPicker({
	siteId,
	recordId,
	state,
	onChange,
	onClose,
	onSavingChange,
}: Props) {
	const warehouse = useFimaWarehouseAvailability(siteId, true, {
		refreshStale: false,
	});
	const [initial] = useState(() => state.materials);
	const [version] = useState(state.version);
	const details = useRef(
		new Map<string, Option>(
			initial.map((material) => [
				material.id,
				{
					id: material.id,
					label: material.label,
					unit: material.unit,
					availableQuantity: null,
				},
			]),
		),
	);
	const [draft, setDraft] = useState<Record<string, string>>(() =>
		Object.fromEntries(
			initial.map((material) => [material.id, String(material.quantity)]),
		),
	);
	const [search, setSearch] = useState("");
	const deferredSearch = useDeferredValue(search);
	const [selectedOnly, setSelectedOnly] = useState(false);
	const [saving, setSaving] = useState(false);
	const [refreshingRecord, setRefreshingRecord] = useState(false);
	const [saveError, setSaveError] = useState("");
	const inFlight = useRef(false);
	const requestId = useRef<string | null>(null);
	const pickerId = useId();
	const catalog = useMemo(
		() =>
			warehouse.rows.map((row) => ({
				id: row.id,
				label: row.label,
				unit: row.measurementUnit ?? "",
				availableQuantity: row.availableQuantity,
			})),
		[warehouse.rows],
	);
	const options = useMemo(() => {
		const present = new Set(catalog.map((material) => material.id));
		return [
			...catalog,
			...Object.keys(draft)
				.filter((id) => !present.has(id))
				.flatMap((id) => {
					const material = details.current.get(id);
					return material ? [{ ...material, availableQuantity: null }] : [];
				}),
		];
	}, [catalog, draft]);
	const byId = useMemo(
		() => new Map(options.map((material) => [material.id, material])),
		[options],
	);
	const selectedIds = Object.keys(draft);
	const errors = new Map<string, string>();
	for (const id of selectedIds) {
		const value = parseQuantity(draft[id]);
		const material = byId.get(id);
		if (!Number.isFinite(value) || value <= 0 || value > 1e9)
			errors.set(id, "Norādiet derīgu daudzumu, kas lielāks par 0.");
		else if (material?.availableQuantity === null && warehouse.loadedAt)
			errors.set(
				id,
				"Materiāls šajā BIS lietā vairs nav pieejams. Noņemiet to no atlases.",
			);
		else if (
			material?.availableQuantity != null &&
			value > material.availableQuantity
		)
			errors.set(
				id,
				`Pieejams: ${quantity.format(material.availableQuantity)} ${material.unit}`,
			);
	}
	const dirty =
		initial.length !== selectedIds.length ||
		initial.some(
			(material) =>
				draft[material.id] === undefined ||
				parseQuantity(draft[material.id]) !== material.quantity,
		);
	const canSave =
		dirty &&
		!saving &&
		!errors.size &&
		selectedIds.length <= 100 &&
		(selectedIds.length === 0 || Boolean(warehouse.loadedAt));
	const visible = useMemo(() => {
		const terms = deferredSearch
			.trim()
			.toLocaleLowerCase("lv")
			.split(/\s+/)
			.filter(Boolean);
		return options.filter(
			(material) =>
				(!selectedOnly || draft[material.id] !== undefined) &&
				terms.every(
					(term) =>
						material.label.toLocaleLowerCase("lv").includes(term) ||
						material.id.toLocaleLowerCase("lv").includes(term),
				),
		);
	}, [options, deferredSearch, selectedOnly, draft]);
	const onQuantity = useCallback((material: Option, value: string) => {
		details.current.set(material.id, material);
		requestId.current = null;
		setSaveError("");
		setDraft((current) =>
			value === "" && current[material.id] === undefined
				? current
				: { ...current, [material.id]: value },
		);
	}, []);
	const onToggle = useCallback((material: Option, checked: boolean) => {
		details.current.set(material.id, material);
		requestId.current = null;
		setSaveError("");
		setDraft((current) => {
			const next = { ...current };
			if (checked)
				next[material.id] = String(
					Math.min(1, material.availableQuantity ?? 1),
				);
			else delete next[material.id];
			return next;
		});
	}, []);
	const save = async () => {
		if (!canSave || inFlight.current) return;
		inFlight.current = true;
		setSaving(true);
		onSavingChange(true);
		setSaveError("");
		requestId.current ??= crypto.randomUUID();
		try {
			const materials = selectedIds.map((id) => {
				const material = byId.get(id);
				if (!material)
					throw new Error("Materiāls nav atrasts pieejamajā sarakstā.");
				return {
					id,
					label: material.label,
					unit: material.unit,
					quantity: parseQuantity(draft[id]),
				};
			});
			const result = await saveFimaDiaryCollaboration({
				siteId,
				recordId,
				kind: "materials",
				requestId: requestId.current,
				materials,
				expectedVersion: version,
			});
			onChange(recordId, result);
			onClose();
			toast.success("Materiāli saglabāti.");
		} catch (cause) {
			setSaveError(errorMessage(cause));
		} finally {
			inFlight.current = false;
			setSaving(false);
			onSavingChange(false);
		}
	};
	return (
		<DialogContent className="flex max-h-[90dvh] flex-col gap-4 overflow-hidden p-4 sm:max-w-5xl sm:p-6">
			<DialogHeader>
				<DialogTitle>Ieraksta materiāli</DialogTitle>
				<DialogDescription>
					Atlasiet materiālus no projekta noliktavas un norādiet izmantoto
					daudzumu. Saglabātā izvēle tiks izmantota, nosūtot darbu uz BIS.
				</DialogDescription>
			</DialogHeader>
			<form
				className="flex min-h-0 flex-1 flex-col gap-4"
				onSubmit={(event) => {
					event.preventDefault();
					void save();
				}}
			>
				<div className="flex flex-wrap items-center gap-2">
					<Input
						aria-label="Meklēt materiālu"
						placeholder="Meklēt pēc nosaukuma vai koda..."
						className="min-w-48 flex-1"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") event.preventDefault();
						}}
					/>
					<Button
						type="button"
						variant={selectedOnly ? "default" : "outline"}
						aria-pressed={selectedOnly}
						onClick={() => setSelectedOnly((current) => !current)}
					>
						Tikai atlasītie ({selectedIds.length})
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={warehouse.loading || saving}
						onClick={() => void warehouse.refresh()}
					>
						{warehouse.loading ? "Atjauno..." : "Atjaunot atlikumus"}
					</Button>
				</div>
				{warehouse.error ? (
					<p
						role="alert"
						className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
					>
						{warehouse.error}
						{warehouse.loadedAt
							? " Tiek rādīti iepriekš ielādētie atlikumi."
							: " Atjaunojiet sarakstu, lai atlasītu materiālus."}
					</p>
				) : null}
				<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
					<span>
						{visible.length} no {options.length} materiāliem
					</span>
					{warehouse.loading ? (
						<output>Ielādē noliktavas atlikumus...</output>
					) : warehouse.loadedAt ? (
						<span>
							Atjaunots: {new Date(warehouse.loadedAt).toLocaleString("lv-LV")}
						</span>
					) : null}
				</div>
				<div
					className="min-h-0 flex-1 overflow-auto rounded-lg border [&>[data-slot=table-container]]:overflow-visible"
					style={{ maxHeight: "52dvh" }}
				>
					<Table className="w-full table-fixed text-sm [&_td]:px-2 [&_th]:px-2">
						<colgroup>
							<col className="w-10" />
							<col />
							<col className="w-20 sm:w-28" />
							<col className="w-24 sm:w-32" />
							<col className="w-12 sm:w-16" />
						</colgroup>
						<TableHeader className="sticky top-0 z-10 bg-muted">
							<TableRow>
								<TableHead>
									<span className="sr-only">Atlase</span>
								</TableHead>
								<TableHead>Materiāls</TableHead>
								<TableHead className="text-right">Pieejams</TableHead>
								<TableHead className="text-right">Daudzums</TableHead>
								<TableHead>Mērv.</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{visible.map((material) => (
								<MaterialRow
									key={material.id}
									material={material}
									value={draft[material.id]}
									error={errors.get(material.id) ?? ""}
									busy={saving}
									inputId={`${pickerId}-${material.id}`}
									onToggle={onToggle}
									onQuantity={onQuantity}
								/>
							))}
							{!visible.length ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="py-10 text-center text-muted-foreground"
									>
										{warehouse.loading && !warehouse.loadedAt
											? "Ielādē pieejamos materiālus..."
											: selectedOnly && !selectedIds.length
												? "Materiāli vēl nav atlasīti."
												: search.trim()
													? "Atbilstoši materiāli nav atrasti."
													: warehouse.error
														? "Noliktavas dati nav pieejami."
														: "BIS nav pieejamu materiālu ar pozitīvu atlikumu."}
									</TableCell>
								</TableRow>
							) : null}
						</TableBody>
					</Table>
				</div>
				{state.bisMaterials ? (
					<details className="max-h-40 shrink-0 overflow-auto rounded-lg border px-3 py-2 text-xs">
						<summary className="cursor-pointer font-medium">
							BIS jau pievienotie materiāli
						</summary>
						<div className="mt-2 space-y-3">
							{state.bisMaterials.entries.map((entry) => (
								<div key={`${entry.caseId}-${entry.bisId}`}>
									<a
										className="text-primary underline"
										href={getFimaBisRecordUrl(entry.bisId) ?? undefined}
										target="_blank"
										rel="noopener noreferrer"
									>
										{entry.number
											? `BIS ieraksts Nr. ${entry.number}`
											: "Atvērt BIS ierakstu"}
									</a>
									{entry.materials.length ? (
										<ul className="mt-1 list-disc space-y-1 pl-4">
											{entry.materials.map((material, index) => (
												<li key={`${material.id}-${index}`}>
													{material.label} ·{" "}
													{quantity.format(material.quantity)} {material.unit}
												</li>
											))}
										</ul>
									) : (
										<p>BIS ierakstam nav materiālu.</p>
									)}
								</div>
							))}
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={saving || refreshingRecord}
								onClick={async () => {
									setRefreshingRecord(true);
									try {
										onChange(
											recordId,
											await refreshFimaBisMaterials({ siteId, recordId }),
										);
									} catch (cause) {
										setSaveError(errorMessage(cause));
									} finally {
										setRefreshingRecord(false);
									}
								}}
							>
								{refreshingRecord
									? "Atjauno..."
									: "Atjaunot ieraksta materiālus no BIS"}
							</Button>
						</div>
					</details>
				) : null}
				<footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
					<div className="text-sm" aria-live="polite">
						<p>
							Atlasīti: <strong>{selectedIds.length}</strong>
						</p>
						{errors.size ? (
							<p className="text-xs text-destructive">
								Pārbaudiet atlasīto materiālu daudzumus.
							</p>
						) : null}
						{selectedIds.length > 100 ? (
							<p className="text-xs text-destructive">
								Vienam ierakstam var atlasīt līdz 100 materiāliem.
							</p>
						) : null}
					</div>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							disabled={saving}
							onClick={onClose}
						>
							Atcelt
						</Button>
						<Button type="submit" disabled={!canSave}>
							{saving ? "Saglabā..." : "Saglabāt materiālus"}
						</Button>
					</div>
					{saveError ? (
						<p role="alert" className="w-full text-sm text-destructive">
							{saveError}
						</p>
					) : null}
				</footer>
			</form>
		</DialogContent>
	);
}
