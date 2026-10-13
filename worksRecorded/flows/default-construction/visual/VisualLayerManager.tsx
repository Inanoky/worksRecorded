"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	normalizeVisualWork,
	removeVisualLayer,
	resolveVisualWorkLayer,
	type VisualLayerConfiguration,
	type VisualLayerSettings,
	visualLayerSettingsSchema,
} from "./layer-settings";

export function VisualLayerManager({
	configuration,
	onSave,
	onClose,
}: {
	configuration: VisualLayerConfiguration;
	onSave: (settings: VisualLayerSettings) => Promise<void>;
	onClose: () => void;
}) {
	const [draft, setDraft] = useState(() =>
		visualLayerSettingsSchema.parse(configuration.settings),
	);
	const [selected, setSelected] = useState(draft.categories[0].id);
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(0);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [removing, setRemoving] = useState(false);
	const [replacement, setReplacement] = useState("other");
	const id = useId();
	const category =
		draft.categories.find((c) => c.id === selected) ?? draft.categories[0];
	const works = [
		...new Set([
			...configuration.workOptions,
			...draft.works.map((w) => w.work),
		]),
	].filter((work) =>
		normalizeVisualWork(work).includes(normalizeVisualWork(query)),
	);
	const currentPage = Math.min(
		page,
		Math.max(0, Math.ceil(works.length / 10) - 1),
	);
	const valid = visualLayerSettingsSchema.safeParse(draft);
	function changeCategory(change: Partial<typeof category>) {
		setDraft((previous) => ({
			...previous,
			categories: previous.categories.map((c) =>
				c.id === selected ? { ...c, ...change } : c,
			),
		}));
	}
	function addCategory() {
		const categoryId = `custom-${crypto.randomUUID()}`;
		let label = "Jauns slānis";
		let suffix = 2;
		while (draft.categories.some((c) => c.label === label))
			label = `Jauns slānis ${suffix++}`;
		setDraft((previous) => ({
			...previous,
			categories: [
				...previous.categories,
				{ id: categoryId, label, color: "#9333ea" },
			],
		}));
		setSelected(categoryId);
		setRemoving(false);
	}
	function assign(work: string, layerId: string) {
		const positionId = configuration.positionIds[normalizeVisualWork(work)];
		setDraft((previous) => ({
			...previous,
			works: [
				...previous.works.filter(
					(entry) =>
						normalizeVisualWork(entry.work) !== normalizeVisualWork(work) &&
						(!positionId || entry.positionId !== positionId),
				),
				...(layerId === "automatic"
					? []
					: [
							{
								work,
								layerId,
								...(configuration.positionIds[normalizeVisualWork(work)]
									? {
											positionId:
												configuration.positionIds[normalizeVisualWork(work)],
										}
									: {}),
							},
						]),
			],
		}));
	}
	async function save() {
		setError(null);
		if (!valid.success) {
			setError(
				valid.error.issues[0]?.message ?? "Pārbaudiet slāņu iestatījumus.",
			);
			return;
		}
		setSaving(true);
		try {
			await onSave(valid.data);
			onClose();
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Neizdevās saglabāt slāņus.",
			);
		} finally {
			setSaving(false);
		}
	}
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !saving) onClose();
			}}
		>
			<DialogContent
				className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-4xl"
				onEscapeKeyDown={(event) => {
					if (saving) event.preventDefault();
				}}
				onInteractOutside={(event) => {
					if (saving) event.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>Pārvaldīt slāņus</DialogTitle>
					<DialogDescription>
						Visām projekta lokācijām. Nosaukuma un krāsas maiņa nemaina zonas;
						darbu piesaistes ir neatkarīgas no slāņa nosaukuma.
					</DialogDescription>
				</DialogHeader>
				<div className="grid min-h-0 flex-1 gap-4 overflow-y-auto md:grid-cols-[200px_minmax(0,1fr)]">
					<div className="space-y-2">
						<fieldset
							className="max-h-72 space-y-1 overflow-y-auto"
							aria-label="Projekta slāņi"
						>
							{draft.categories.map((c) => (
								<Button
									key={c.id}
									variant={c.id === selected ? "secondary" : "ghost"}
									className="h-auto min-h-9 w-full justify-start gap-2 whitespace-normal text-left"
									aria-pressed={c.id === selected}
									disabled={saving}
									onClick={() => {
										setSelected(c.id);
										setRemoving(false);
									}}
								>
									<span
										aria-hidden="true"
										className="h-3 w-3 shrink-0 rounded-sm"
										style={{ backgroundColor: c.color }}
									/>
									{c.label || "Bez nosaukuma"}
								</Button>
							))}
						</fieldset>
						<Button
							variant="outline"
							size="sm"
							disabled={saving || draft.categories.length >= 60}
							onClick={addCategory}
						>
							<Plus className="mr-2 h-4 w-4" />
							Pievienot slāni
						</Button>
					</div>
					<div className="min-w-0 space-y-4">
						<div className="grid grid-cols-[minmax(0,1fr)_80px] gap-3">
							<div className="space-y-1">
								<Label htmlFor={`${id}-name`}>Slāņa nosaukums</Label>
								<Input
									id={`${id}-name`}
									value={category.label}
									maxLength={80}
									disabled={saving}
									onChange={(event) =>
										changeCategory({ label: event.target.value })
									}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor={`${id}-color`}>Krāsa</Label>
								<Input
									id={`${id}-color`}
									type="color"
									value={category.color}
									disabled={saving}
									onChange={(event) =>
										changeCategory({ color: event.target.value })
									}
								/>
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="text-destructive"
							disabled={saving || selected === "other"}
							onClick={() => {
								setRemoving(true);
								setReplacement("other");
							}}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Dzēst slāni
						</Button>
						{removing ? (
							<div className="space-y-2 rounded-md border border-destructive/30 p-3">
								<p className="text-sm">
									Zonas netiks dzēstas. Kur pārvietot šī slāņa darbus un zonas?
								</p>
								<select
									aria-label="Aizvietojošais slānis"
									className="h-9 w-full rounded-md border bg-background px-2 text-sm"
									value={replacement}
									disabled={saving}
									onChange={(event) => setReplacement(event.target.value)}
								>
									{draft.categories
										.filter((c) => c.id !== selected)
										.map((c) => (
											<option key={c.id} value={c.id}>
												{c.label}
											</option>
										))}
								</select>
								<div className="flex gap-2">
									<Button
										variant="destructive"
										size="sm"
										disabled={saving}
										onClick={() => {
											try {
												setDraft(
													removeVisualLayer(draft, selected, replacement),
												);
												setSelected(replacement);
												setRemoving(false);
												setError(null);
											} catch (error) {
												setError(
													error instanceof Error
														? error.message
														: "Nederīgi slāņi.",
												);
											}
										}}
									>
										Apstiprināt dzēšanu
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setRemoving(false)}
									>
										Atcelt dzēšanu
									</Button>
								</div>
							</div>
						) : null}
						<div className="space-y-2 border-t pt-3">
							<h4 className="text-sm font-medium">Darbu piesaiste slāņiem</h4>
							<p className="text-xs text-muted-foreground">
								Izvēlieties slāni katram darbam. “Automātiski” izmanto esošos
								atslēgvārdus. Atsevišķas zonas slāni var mainīt zonas panelī.
							</p>
							<Input
								aria-label="Meklēt darbu"
								placeholder="Meklēt darbu…"
								value={query}
								disabled={saving}
								onChange={(event) => {
									setQuery(event.target.value);
									setPage(0);
								}}
							/>
							<div className="divide-y rounded-md border">
								{works
									.slice(currentPage * 10, currentPage * 10 + 10)
									.map((work) => {
										const assignment =
											draft.works.find(
												(entry) =>
													normalizeVisualWork(entry.work) ===
													normalizeVisualWork(work),
											) ??
											draft.works.find(
												(entry) =>
													entry.positionId &&
													entry.positionId ===
														configuration.positionIds[
															normalizeVisualWork(work)
														],
											);
										const resolved = draft.categories.find(
											(c) =>
												c.id ===
												resolveVisualWorkLayer(
													work,
													draft,
													configuration.positionIds,
												),
										);
										return (
											<div
												key={work}
												className="grid gap-2 p-2 sm:grid-cols-[minmax(0,1fr)_180px]"
											>
												<span className="text-xs [overflow-wrap:anywhere]">
													{work}
												</span>
												<select
													aria-label={`Slānis: ${work}`}
													className="h-8 min-w-0 rounded-md border bg-background px-2 text-xs"
													value={assignment?.layerId ?? "automatic"}
													disabled={saving}
													onChange={(event) => assign(work, event.target.value)}
												>
													<option value="automatic">
														Automātiski
														{assignment ? "" : ` · ${resolved?.label ?? ""}`}
													</option>
													{draft.categories.map((c) => (
														<option key={c.id} value={c.id}>
															{c.label}
														</option>
													))}
												</select>
											</div>
										);
									})}
								{!works.length ? (
									<p className="p-3 text-xs text-muted-foreground">
										Darbi nav atrasti.
									</p>
								) : null}
							</div>
							<div className="flex items-center justify-between gap-2">
								<Button
									size="sm"
									variant="outline"
									disabled={saving || currentPage === 0}
									onClick={() => setPage(currentPage - 1)}
								>
									Iepriekšējā
								</Button>
								<span className="text-xs text-muted-foreground">
									{works.length
										? `${currentPage * 10 + 1}–${Math.min(works.length, currentPage * 10 + 10)} no ${works.length}`
										: "0"}
								</span>
								<Button
									size="sm"
									variant="outline"
									disabled={saving || (currentPage + 1) * 10 >= works.length}
									onClick={() => setPage(currentPage + 1)}
								>
									Nākamā
								</Button>
							</div>
						</div>
					</div>
				</div>
				{!valid.success ? (
					<output className="text-xs text-destructive">
						Norādiet unikālus slāņu nosaukumus (1–80 rakstzīmes) un derīgas
						krāsas.
					</output>
				) : null}
				{error ? (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				) : null}
				<DialogFooter>
					<Button variant="outline" disabled={saving} onClick={onClose}>
						Atcelt
					</Button>
					<Button
						disabled={saving || !valid.success || removing}
						onClick={() => void save()}
					>
						{saving ? "Saglabā…" : "Saglabāt"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
