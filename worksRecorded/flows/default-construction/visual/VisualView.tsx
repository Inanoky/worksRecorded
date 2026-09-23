"use client";

import { useEffect, useId, useRef, useState } from "react";
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
import { getVisualDrawings, refreshVisualDrawing } from "./actions";
import {
	normalizeVisualLocation,
	VISUAL_MAX_BYTES,
	type VisualDrawing,
	type VisualLayer,
	visualLayers,
} from "./model";
import { VisualPdf } from "./VisualPdf";

type Index = Awaited<ReturnType<typeof getVisualDrawings>>;
const allLayers = Object.keys(visualLayers) as VisualLayer[];

export default function VisualView({ siteId }: { siteId: string }) {
	const [index, setIndex] = useState<Index | null>(null);
	const [location, setLocation] = useState("");
	const [drawing, setDrawing] = useState<VisualDrawing | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [progress, setProgress] = useState(0);
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
		setError(null);
		try {
			const response = await fetch(endpoint(id), { cache: "no-store" });
			const data = await response.json();
			if (!response.ok) throw new Error(data.error);
			if (request === requestId.current) {
				setDrawing(data);
				setLocation(data.state.location);
			}
		} catch {
			if (request === requestId.current)
				setError("Neizdevās ielādēt rasējumu.");
		} finally {
			if (request === requestId.current) setLoading(false);
		}
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
	async function process(mode: "upload" | "resume" | "refresh") {
		if (busyRef.current) return;
		const run = epoch.current;
		busyRef.current = true;
		setBusy(true);
		setError(null);
		setProgress(0);
		try {
			let id = drawing?.id;
			if (mode === "upload") {
				if (!file || !location) throw new Error("Izvēlieties lokāciju un PDF.");
				if (file.type !== "application/pdf" || file.size > VISUAL_MAX_BYTES)
					throw new Error(
						"Izvēlieties PDF līdz 16 MB (ne vairāk kā 10 lapas).",
					);
				const files = await startUpload([file], { siteId, location });
				id = files?.[0]?.serverData?.drawingId;
			} else if (mode === "refresh" && id)
				id = await refreshVisualDrawing(siteId, id);
			if (!id) throw new Error("PDF augšupielāde neizdevās.");
			if (run !== epoch.current) return;
			await loadDrawing(id);
			await analyze(id, run);
			const data = await getVisualDrawings(siteId);
			if (run === epoch.current) setIndex(data);
		} catch (issue) {
			if (run === epoch.current)
				setError(issue instanceof Error ? issue.message : "Analīze neizdevās.");
		} finally {
			busyRef.current = false;
			if (run === epoch.current) setBusy(false);
		}
	}
	const locationDrawings =
		index?.drawings.filter(
			(item) =>
				normalizeVisualLocation(item.location) ===
				normalizeVisualLocation(location),
		) ?? [];
	const visibleMarks =
		drawing?.state.marks.filter((mark) => layers.includes(mark.layer)) ?? [];
	const selectedMark = visibleMarks.find((mark) => mark.id === selected);
	const source = drawing?.state.evidence.find(
		(item) => item.id === selectedMark?.evidenceId,
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>Visual — darbu slāņi</CardTitle>
				<p className="text-sm text-muted-foreground">
					Izvēlieties lokāciju un augšupielādējiet tās PDF rasējumu. AI
					salīdzinās to ar šīs lokācijas žurnāla ierakstiem piesaistītajiem
					attēliem.
				</p>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="grid gap-3 md:grid-cols-2">
					<div className="space-y-2">
						<Label>Lokācija</Label>
						<Select
							value={location}
							disabled={busy || loading}
							onValueChange={(value) => {
								++requestId.current;
								setLocation(value);
								setDrawing(null);
								setSelected(null);
							}}
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
					<div className="space-y-2">
						<Label>Saglabātie rasējumi</Label>
						<Select
							value={drawing?.id ?? ""}
							disabled={busy || loading || !locationDrawings.length}
							onValueChange={(id) => void loadDrawing(id)}
						>
							<SelectTrigger aria-label="Saglabātie rasējumi">
								<SelectValue placeholder="Izvēlieties rasējumu" />
							</SelectTrigger>
							<SelectContent>
								{locationDrawings.map((item) => (
									<SelectItem key={item.id} value={item.id}>
										{item.name} ·{" "}
										{new Date(item.createdAt).toLocaleString("lv-LV")}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				{index && !index.locations.length ? (
					<p className="text-sm text-muted-foreground">
						Vispirms norādiet lokāciju būvdarbu žurnāla ierakstos un
						pievienojiet tai darbu attēlus.
					</p>
				) : null}
				<div className="flex flex-wrap items-end gap-3">
					<div className="min-w-0 flex-1 space-y-2">
						<Label htmlFor={fileId}>
							Jauns PDF rasējums (līdz 16 MB, 10 lapām)
						</Label>
						<Input
							id={fileId}
							type="file"
							accept="application/pdf,.pdf"
							disabled={busy || loading || !location}
							onChange={(event) => setFile(event.target.files?.[0] ?? null)}
						/>
					</div>
					<Button
						disabled={busy || loading || !file || !location}
						onClick={() => void process("upload")}
					>
						Augšupielādēt un analizēt
					</Button>
				</div>
				{!index || loading ? (
					<output className="block text-sm">Ielādē…</output>
				) : null}
				{busy ? (
					<output className="block text-sm">
						{drawing
							? `Analizēti ${drawing.state.processed} no ${drawing.state.evidence.length} attēliem. Katra grupa var aizņemt dažas minūtes.`
							: `Augšupielāde: ${progress}%`}{" "}
						Aizverot skatu, analīzi varēsiet turpināt vēlāk.
					</output>
				) : null}
				{error || drawing?.state.error ? (
					<p role="alert" className="text-sm text-destructive">
						{error || drawing?.state.error}
					</p>
				) : null}
				{drawing ? (
					<>
						<div className="flex flex-wrap items-center gap-3">
							<h3 className="font-medium">
								{drawing.name} · {drawing.state.location}
							</h3>
							{!["complete", "unlocated"].includes(drawing.state.status) ? (
								<Button
									variant="outline"
									disabled={busy}
									onClick={() => void process("resume")}
								>
									Turpināt analīzi
								</Button>
							) : (
								<Button
									variant="outline"
									disabled={busy}
									onClick={() => void process("refresh")}
								>
									Atjaunot no žurnāla
								</Button>
							)}
						</div>
						<p className="rounded-md border bg-muted p-3 text-sm">
							AI ieteiktās zonas — pirms izmantošanas pārbaudiet avota attēlus.
							Tas nav precīzs uzmērījums vai apstiprināts darbu apjoms. Slāņi
							var pārklāties. Analīze izmanto augšupielādes brīža ierakstus;
							jaunus ierakstus iekļauj ar “Atjaunot no žurnāla”.
						</p>
						<fieldset className="flex flex-wrap gap-4" aria-label="Darbu slāņi">
							{allLayers.map((key) => (
								<label
									key={key}
									htmlFor={`${fileId}-${key}`}
									className="flex items-center gap-2 text-sm"
								>
									<Checkbox
										id={`${fileId}-${key}`}
										checked={layers.includes(key)}
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
									{
										drawing.state.marks.filter((mark) => mark.layer === key)
											.length
									}
									)
								</label>
							))}
						</fieldset>
						<div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
							<VisualPdf
								key={drawing.id}
								url={`${endpoint(drawing.id)}?pdf=1`}
								marks={visibleMarks}
								selected={selected}
								onSelect={setSelected}
							/>
							<div className="space-y-3">
								<h4 className="font-medium">Zonu avoti</h4>
								<div className="max-h-64 space-y-1 overflow-y-auto">
									{visibleMarks.map((mark, i) => (
										<Button
											key={mark.id}
											variant={selected === mark.id ? "secondary" : "ghost"}
											className="h-auto w-full justify-start whitespace-normal text-left"
											onClick={() => setSelected(mark.id)}
										>
											{i + 1}. {visualLayers[mark.layer].label} · lapa{" "}
											{mark.page}
										</Button>
									))}
								</div>
								{source && selectedMark ? (
									<div className="space-y-2 rounded-md border p-3 text-sm">
										<p className="font-medium">{source.work}</p>
										<p>
											{source.location} ·{" "}
											{source.date
												? new Date(source.date).toLocaleDateString("lv-LV")
												: "—"}
										</p>
										<p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
											{source.description}
										</p>
										<p>{selectedMark.explanation}</p>
										<p className="text-xs text-muted-foreground">
											{selectedMark.anchors.join("; ")}
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
			</CardContent>
		</Card>
	);
}
