"use client";

import { Layers, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useUploadThing } from "@/lib/utils/UploadthingsComponents";
import { DiaryRecordPhotos } from "../frontend/DiaryRecordPhotos";
import {
	deleteVisualDrawing,
	getVisualDrawings,
	refreshVisualDrawing,
	restartVisualDrawing,
	saveVisualPolygon,
} from "./actions";
import {
	normalizeVisualLocation,
	VISUAL_MAX_BYTES,
	type VisualDrawing,
	type VisualLayer,
	visualLayers,
} from "./model";
import {
	buildVisualTimeline,
	cumulativeVisualMarks,
	formatVisualDay,
	sortVisualMarksChronologically,
	visualDiaryDay,
} from "./timeline";
import {
	type VisualAnalysisPhase,
	VisualAnalysisProgress,
} from "./VisualAnalysisProgress";
import { VisualPdf } from "./VisualPdf";
import { VisualTimeline } from "./VisualTimeline";

type Index = Awaited<ReturnType<typeof getVisualDrawings>>;
const allLayers = Object.keys(visualLayers) as VisualLayer[];

export default function VisualView({ siteId }: { siteId: string }) {
	const [index, setIndex] = useState<Index | null>(null);
	const [location, setLocation] = useState("");
	const [drawing, setDrawing] = useState<VisualDrawing | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [editing, setEditing] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const controlsLocked = busy || editing;
	const [confirmation, setConfirmation] = useState<
		"delete" | "restart" | "replace" | "refresh" | null
	>(null);
	const [deleting, setDeleting] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [progress, setProgress] = useState(0);
	const [phase, setPhase] = useState<VisualAnalysisPhase>("idle");
	const [throughDay, setThroughDay] = useState<number | null>(null);
	const [includeUndated, setIncludeUndated] = useState(false);
	const [layers, setLayers] = useState<VisualLayer[]>(allLayers);
	const [selected, setSelected] = useState<string | null>(null);
	const epoch = useRef(0);
	const busyRef = useRef(false);
	const requestId = useRef(0);
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
	async function loadDrawing(id: string) {
		const request = ++requestId.current;
		setDrawing(null);
		setLoading(true);
		setSelected(null);
		setThroughDay(null);
		setIncludeUndated(false);
		setError(null);
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
		setLoading(false);
		const assigned = index?.drawings.find(
			(item) =>
				normalizeVisualLocation(item.location) ===
				normalizeVisualLocation(value),
		);
		if (assigned) void loadDrawing(assigned.id);
	}
	async function analyze(id: string, run: number) {
		while (run === epoch.current) {
			const response = await fetch(endpoint(id), { method: "POST" });
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Analīze neizdevās.");
			if (run !== epoch.current) return;
			const result = data as VisualDrawing;
			setDrawing(result);
			if (result.state.status !== "paused") break;
		}
	}
	async function process(mode: "upload" | "resume" | "refresh" | "restart") {
		if (busyRef.current) return;
		const run = epoch.current;
		busyRef.current = true;
		setBusy(true);
		setError(null);
		setProgress(0);
		setPhase(mode === "upload" ? "upload" : "preparing");
		try {
			let id = drawing?.id;
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
			} else if (mode === "refresh" && id)
				id = await refreshVisualDrawing(siteId, id);
			else if (mode === "restart" && id) await restartVisualDrawing(siteId, id);
			if (!id) throw new Error("PDF augšupielāde neizdevās.");
			if (run !== epoch.current) return;
			setPhase("preparing");
			const loaded = await loadDrawing(id);
			if (!loaded || run !== epoch.current) return;
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
		() => buildVisualTimeline(drawing?.state.evidence ?? []),
		[drawing?.state.evidence],
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
	return (
		<Card className="gap-0 overflow-hidden py-0">
			<CardHeader className="border-b py-4">
				<CardTitle>Visual — darbu slāņi</CardTitle>
				<p className="text-sm text-muted-foreground">
					Izvēlieties lokāciju, lai atvērtu tās rasējumu un darbu slāņus. PDF
					rasējums jāpievieno tikai vienreiz; to var aizstāt, ja nepieciešams.
				</p>
			</CardHeader>
			<CardContent className="space-y-4 p-4">
				<div className="grid gap-3 md:grid-cols-2">
					<div className="min-w-0 space-y-2">
						<Label>Lokācija</Label>
						<Select
							value={location}
							disabled={controlsLocked || !index}
							onValueChange={selectLocation}
						>
							<SelectTrigger aria-label="Lokācija">
								<SelectValue placeholder="Izvēlieties lokāciju" />
							</SelectTrigger>
							<SelectContent>
								{index?.locations.map((item) => (
									<SelectItem key={item} value={item}>
										{item}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="min-w-0 space-y-2">
						<p className="text-sm font-medium">Lokācijas rasējums</p>
						<p className="py-2 text-sm [overflow-wrap:anywhere]">
							{drawing?.name ||
								locationDrawings[0]?.name ||
								(location
									? "Rasējums vēl nav pievienots"
									: "Izvēlieties lokāciju")}
						</p>
						{error && !drawing && locationDrawings[0] ? (
							<Button
								variant="outline"
								size="sm"
								disabled={loading || controlsLocked}
								onClick={() => void loadDrawing(locationDrawings[0].id)}
							>
								Mēģināt vēlreiz
							</Button>
						) : null}
					</div>
				</div>
				{index && !index.locations.length ? (
					<p className="text-sm text-muted-foreground">
						Vispirms norādiet lokāciju būvdarbu žurnāla ierakstos un
						pievienojiet tai darbu attēlus.
					</p>
				) : null}
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
								onChange={(event) => setFile(event.target.files?.[0] ?? null)}
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
				{!index || loading ? (
					<output className="block text-sm">Ielādē…</output>
				) : null}
				{deleting ? (
					<output className="block text-sm">Dzēš rasējumu…</output>
				) : (
					<VisualAnalysisProgress
						phase={phase}
						drawing={drawing}
						uploadProgress={progress}
						interrupted={!!error}
					/>
				)}
				{error || drawing?.state.error ? (
					<p role="alert" className="text-sm text-destructive">
						{error || drawing?.state.error}
					</p>
				) : null}
				{drawing ? (
					<>
						<div className="flex flex-wrap items-center gap-2">
							<h3
								className="min-w-0 flex-1 truncate text-sm font-medium"
								title={drawing.name}
							>
								{drawing.name} · {drawing.state.location}
							</h3>
							{!["complete", "unlocated"].includes(drawing.state.status) ? (
								<Button
									variant="outline"
									disabled={controlsLocked}
									onClick={() => void process("resume")}
								>
									Turpināt analīzi
								</Button>
							) : (
								<Button
									variant="outline"
									disabled={controlsLocked}
									onClick={() => setConfirmation("refresh")}
								>
									Atjaunot no žurnāla
								</Button>
							)}
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
								avota attēlus. Tas nav precīzs uzmērījums vai apstiprināts darbu
								apjoms. Slāņi var pārklāties. Analīze izmanto augšupielādes
								brīža ierakstus; jaunus ierakstus iekļauj ar “Atjaunot no
								žurnāla”.
							</p>
						</details>
						<div className="flex items-center justify-between border-t pt-3">
							<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Rasējuma karte · {visibleMarks.length} zonas
							</span>
							<Button
								variant="outline"
								size="sm"
								aria-expanded={sidebarOpen}
								aria-controls={`${fileId}-sidebar`}
								onClick={() => setSidebarOpen((value) => !value)}
							>
								{sidebarOpen ? (
									<PanelLeftClose className="mr-2 h-4 w-4" />
								) : (
									<PanelLeftOpen className="mr-2 h-4 w-4" />
								)}
								{sidebarOpen
									? "Paslēpt slāņus un avotus"
									: "Rādīt slāņus un avotus"}
							</Button>
						</div>
						<div
							className={`grid min-w-0 items-start gap-4 ${sidebarOpen ? "lg:grid-cols-[280px_minmax(0,1fr)]" : "grid-cols-1"}`}
						>
							<aside
								id={`${fileId}-sidebar`}
								hidden={!sidebarOpen}
								className="order-2 min-w-0 space-y-4 overflow-y-auto rounded-xl border bg-background p-3 lg:order-1 lg:max-h-[min(70dvh,800px)]"
								aria-label="Darbu slāņi un avoti"
							>
								<fieldset
									className="flex flex-col gap-1"
									aria-label="Darbu slāņi"
								>
									<legend className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										<Layers className="h-3.5 w-3.5" /> Darbu slāņi
									</legend>
									{allLayers.map((key) => (
										<label
											key={key}
											htmlFor={`${fileId}-${key}`}
											className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
										>
											<Checkbox
												id={`${fileId}-${key}`}
												checked={layers.includes(key)}
												disabled={editing}
												onCheckedChange={(checked) =>
													setLayers((values) =>
														checked
															? [...values, key]
															: values.filter((item) => item !== key),
													)
												}
											/>
											<span
												aria-hidden="true"
												className="h-3 w-3 rounded-sm"
												style={{ backgroundColor: visualLayers[key].color }}
											/>
											{visualLayers[key].label} (
											{datedMarks.filter((mark) => mark.layer === key).length})
										</label>
									))}
								</fieldset>
								<div className="space-y-3">
									<h4 className="font-medium">Zonu avoti</h4>
									<div className="max-h-64 space-y-1 overflow-y-auto">
										{visibleMarks.map((mark, i) => (
											<Button
												key={mark.id}
												disabled={editing}
												variant={selected === mark.id ? "secondary" : "ghost"}
												className="h-auto w-full justify-start whitespace-normal text-left"
												onClick={() => setSelected(mark.id)}
											>
												<span className="min-w-0">
													<span className="block text-xs text-muted-foreground">
														{timeline.dayByEvidence.get(mark.evidenceId) != null
															? formatVisualDay(
																	timeline.dayByEvidence.get(
																		mark.evidenceId,
																	) as number,
																)
															: "Bez datuma"}{" "}
														· lapa {mark.page}
													</span>
													<span className="block [overflow-wrap:anywhere]">
														{i + 1}.{" "}
														{drawing.state.evidence.find(
															(item) => item.id === mark.evidenceId,
														)?.work || visualLayers[mark.layer].label}
													</span>
												</span>
											</Button>
										))}
									</div>
									{source && selectedMark ? (
										<div className="space-y-2 rounded-md border p-3 text-sm">
											<p className="font-medium">{source.work}</p>
											<p>
												{source.location} ·{" "}
												{visualDiaryDay(source.date) !== null
													? formatVisualDay(
															visualDiaryDay(source.date) as number,
														)
													: "—"}
											</p>
											<p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
												{source.description}
											</p>
											<DiaryRecordPhotos
												photos={[source.photoUrl]}
												language="lv"
											/>
										</div>
									) : (
										<p className="text-sm text-muted-foreground">
											Izvēlieties zonu, lai pārbaudītu tās avotu.
										</p>
									)}
								</div>
							</aside>
							<div className="order-1 min-w-0 space-y-4 lg:order-2">
								<VisualPdf
									key={drawing.id}
									url={`${endpoint(drawing.id)}?pdf=1`}
									marks={visibleMarks}
									evidence={drawing.state.evidence}
									selected={selectedMark?.id ?? null}
									onSelect={setSelected}
									editable={!busy && drawing.state.status !== "running"}
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
								<fieldset disabled={editing} className="min-w-0">
									<VisualTimeline
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
							</div>
						</div>
						{drawing.state.unlocated.length ? (
							<details className="rounded-md border p-3">
								<summary className="cursor-pointer text-sm font-medium">
									Neizdevās izvietot: {drawing.state.unlocated.length} attēli
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
										: confirmation === "refresh"
											? "Atjaunot analīzi no žurnāla?"
											: "Sākt analīzi no jauna?"}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{confirmation === "delete"
									? `Rasējums “${drawing?.name}” un tā analīzes rezultāti tiks neatgriezeniski noņemti no Visual skata. Žurnāla ieraksti, fotoattēli un citi rasējumi netiks mainīti.`
									: confirmation === "replace"
										? "Katrai lokācijai ir viens aktīvs rasējums. Iepriekšējais rasējums un tā zonas tiks arhivēti; jaunais PDF tiks analizēts no jauna."
										: confirmation === "refresh"
											? "Esošā analīze un manuālie labojumi tiks arhivēti. Tas pats PDF tiks analizēts ar jaunākajiem žurnāla ierakstiem."
											: "Esošās zonas un manuālie labojumi tiks aizstāti ar jaunu analīzi, izmantojot to pašu PDF un saglabātos avota attēlus. Lai iekļautu jaunus žurnāla ierakstus, izmantojiet “Atjaunot no žurnāla”."}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Atcelt</AlertDialogCancel>
							<AlertDialogAction
								disabled={busy}
								onClick={() => {
									if (confirmation === "delete") void removeDrawing();
									else if (confirmation === "replace") void process("upload");
									else if (confirmation === "refresh") void process("refresh");
									else void process("restart");
								}}
							>
								{confirmation === "delete"
									? "Jā, dzēst"
									: confirmation === "replace"
										? "Jā, aizstāt"
										: confirmation === "refresh"
											? "Jā, atjaunot"
											: "Jā, sākt no jauna"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</CardContent>
		</Card>
	);
}
