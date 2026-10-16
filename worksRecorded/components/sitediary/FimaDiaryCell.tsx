"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	getFimaBisRecordUrl,
	readFimaBisRecordLinks,
} from "@/lib/fima/bis-record-links";
import type {
	FimaCollaboration,
	FimaMaterial,
} from "@/lib/fima/diary-collaboration";
import {
	getFimaAvailableMaterials,
	getFimaDiaryCollaboration,
	refreshFimaBisMaterials,
	saveFimaDiaryCollaboration,
} from "@/server/actions/fima-diary-collaboration";
import { FimaCommentCell } from "./FimaCommentCell";
import { FimaRecordHistory } from "./FimaRecordHistory";
import { FimaReviewBadge } from "./FimaReviewBadge";

type MaterialOption = {
	id: string;
	label: string;
	measurementUnit: string;
	availableQuantity: number;
};
type Props = {
	field: string;
	siteId: string;
	row: {
		id?: string;
		BISId?: string | null;
		fimaCollaboration?: FimaCollaboration;
		[key: string]: unknown;
	};
	caseNumber?: string | null;
	caseId?: string | null;
	onOpenRecord?: () => void;
	materialEditor?: boolean;
	onChange: (id: string, state: FimaCollaboration) => void;
};
const empty: FimaCollaboration = {
	version: 0,
	status: null,
	materials: [],
	history: [],
};
const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : "Neizdevās saglabāt izmaiņas.";
export function FimaDiaryCell({
	field,
	siteId,
	row,
	onOpenRecord,
	materialEditor = false,
	onChange,
}: Props) {
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [loading, setLoading] = useState(false);
	const [draft, setDraft] = useState<FimaMaterial[]>([]);
	const [draftVersion, setDraftVersion] = useState(0);
	const [options, setOptions] = useState<MaterialOption[]>([]);
	const [search, setSearch] = useState("");
	const state = row.fimaCollaboration ?? empty;
	const isMaterials = field === "FimaMaterials";
	useEffect(() => {
		if (!open || !row.id || !isMaterials) return;
		let active = true;
		const id = row.id;
		setLoading(true);
		getFimaDiaryCollaboration({ siteId, recordId: id })
			.then((value) => {
				if (active) {
					onChange(id, value);
					setDraft(value.materials);
					setDraftVersion(value.version);
				}
			})
			.catch((error) => {
				if (active) toast.error(errorMessage(error));
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		const interval = setInterval(() => {
			getFimaDiaryCollaboration({ siteId, recordId: id })
				.then((value) => {
					if (active) onChange(id, value);
				})
				.catch(() => {});
		}, 15000);
		return () => {
			active = false;
			clearInterval(interval);
		};
	}, [open, row.id, siteId, onChange, isMaterials]);
	if (field === "FimaBisCase") {
		const links = readFimaBisRecordLinks(
			{
				kuceImport: { bisLinks: row.fimaBisRecords },
				fimaCollaboration: state,
			},
			row.BISId,
		);
		return (
			<span className="flex flex-wrap gap-x-2 gap-y-1">
				{links
					.filter((link) => link.number)
					.map((link) => (
						<a
							key={link.id}
							href={getFimaBisRecordUrl(link.id) ?? undefined}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary underline underline-offset-2 tabular-nums"
							onClick={(event) => event.stopPropagation()}
						>
							{link.number}
						</a>
					))}
			</span>
		);
	}
	if (!row.id) return <span>—</span>;
	const scope = { siteId, recordId: row.id };
	const update = async (action: () => Promise<FimaCollaboration>) => {
		setBusy(true);
		try {
			const value = await action();
			onChange(scope.recordId, value);
			return value;
		} catch (error) {
			toast.error(errorMessage(error));
			return null;
		} finally {
			setBusy(false);
		}
	};
	if (field === "FimaReviewStatus")
		return (
			<FimaReviewBadge
				key={`${siteId}-${row.id}`}
				siteId={siteId}
				recordId={row.id}
				state={state}
				onChange={onChange}
			/>
		);

	const snapshot = state.bisMaterials;
	const preparedIds = new Set(state.materials.map((material) => material.id));
	const displayedMaterials = [
		...state.materials,
		...(snapshot?.entries.flatMap((entry) => entry.materials) ?? []).filter(
			(material) => !preparedIds.has(material.id),
		),
	];

	return (
		<>
			{isMaterials ? (
				materialEditor ? (
					<Button variant="outline" size="sm" onClick={() => setOpen(true)}>
						Pārvaldīt materiālus
					</Button>
				) : displayedMaterials.length ? (
					<ul className="list-disc space-y-2 pl-4 text-xs marker:text-primary">
						{displayedMaterials.map((m, index) => (
							<li key={`${m.id}-${index}`}>
								<button
									type="button"
									className="w-full whitespace-normal text-left leading-relaxed hover:text-primary"
									onClick={() => setOpen(true)}
								>
									{m.label} · {m.quantity} {m.unit}
								</button>
							</li>
						))}
					</ul>
				) : null
			) : (
				<FimaCommentCell
					siteId={siteId}
					recordId={row.id}
					state={state}
					onChange={onChange}
					onOpenRecord={() => {
						if (onOpenRecord) onOpenRecord();
						else setOpen(true);
					}}
				/>
			)}

			<Dialog
				open={open}
				onOpenChange={(value) => {
					if (!busy) setOpen(value);
				}}
			>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							{isMaterials
								? "Ieraksta materiāli"
								: "Komentāri un izmaiņu vēsture"}
						</DialogTitle>
						<DialogDescription>
							{isMaterials
								? "Sagatavotais saraksts tiks ielasīts BIS nosūtīšanas logā. Saglabāšana šeit nemaina BIS ierakstu."
								: "Organizācijas dalībnieku komentāri un rīcības izmaiņas tiek saglabātas ar autoru un laiku."}
						</DialogDescription>
					</DialogHeader>
					{loading ? (
						<output>Ielādē...</output>
					) : isMaterials ? (
						<div className="space-y-5">
							<section className="space-y-3">
								<h3 className="font-medium">Sagatavotie materiāli</h3>
								{draft.map((m) => (
									<div
										key={m.id}
										className="flex flex-wrap items-center gap-2 rounded border p-2"
									>
										<span className="min-w-0 flex-1 text-sm">{m.label}</span>
										<Input
											aria-label={`Daudzums: ${m.label}`}
											type="number"
											min="0.001"
											step="any"
											className="w-24"
											value={m.quantity}
											onChange={(e) =>
												setDraft((items) =>
													items.map((item) =>
														item.id === m.id
															? { ...item, quantity: Number(e.target.value) }
															: item,
													),
												)
											}
										/>
										<span className="text-sm">{m.unit}</span>
										<Button
											variant="ghost"
											size="sm"
											onClick={() =>
												setDraft((items) =>
													items.filter((item) => item.id !== m.id),
												)
											}
										>
											Noņemt
										</Button>
									</div>
								))}
								<Button
									variant="outline"
									disabled={busy}
									onClick={async () => {
										setBusy(true);
										try {
											setOptions(
												(await getFimaAvailableMaterials(scope))
													.filter((m): m is NonNullable<typeof m> => m !== null)
													.map((m) => ({
														id: String(m.id),
														label: String(m.label),
														measurementUnit: m.measurementUnit ?? "",
														availableQuantity: Number(m.availableQuantity),
													})),
											);
										} catch (error) {
											toast.error(errorMessage(error));
										} finally {
											setBusy(false);
										}
									}}
								>
									Ielādēt pieejamos BIS materiālus
								</Button>
								{options.length ? (
									<>
										<Input
											aria-label="Meklēt materiālu"
											placeholder="Meklēt materiālu..."
											value={search}
											onChange={(e) => setSearch(e.target.value)}
										/>
										<div className="max-h-48 overflow-y-auto rounded border">
											{options
												.filter(
													(m) =>
														!draft.some((d) => d.id === m.id) &&
														m.label
															.toLocaleLowerCase("lv")
															.includes(search.toLocaleLowerCase("lv")),
												)
												.slice(0, 80)
												.map((m) => (
													<button
														key={m.id}
														type="button"
														className="block w-full border-b p-2 text-left text-sm hover:bg-muted"
														onClick={() =>
															setDraft((items) => [
																...items,
																{
																	id: m.id,
																	label: m.label,
																	unit: m.measurementUnit,
																	quantity: Math.min(1, m.availableQuantity),
																},
															])
														}
													>
														{m.label}
														<span className="block text-muted-foreground">
															Pieejams: {m.availableQuantity}{" "}
															{m.measurementUnit}
														</span>
													</button>
												))}
										</div>
									</>
								) : null}
								<Button
									disabled={busy || loading}
									onClick={() =>
										void update(() =>
											saveFimaDiaryCollaboration({
												...scope,
												requestId: crypto.randomUUID(),
												kind: "materials",
												materials: draft,
												expectedVersion: draftVersion,
											}),
										).then((saved) => {
											if (saved) {
												setDraft(saved.materials);
												setDraftVersion(saved.version);
												toast.success("Materiāli saglabāti.");
											}
										})
									}
								>
									Saglabāt sagatavotos materiālus
								</Button>
							</section>
							<section className="space-y-2 border-t pt-4">
								<h3 className="font-medium">BIS pievienotie materiāli</h3>
								<p className="text-xs text-muted-foreground">
									{snapshot
										? `Pārbaudīts: ${new Date(snapshot.fetchedAt).toLocaleString("lv-LV")}`
										: "Dati vēl nav ielādēti. Tukšs sagatavotais saraksts nenozīmē, ka BIS nav materiālu."}
								</p>
								{snapshot?.entries.map((entry) => (
									<div
										key={`${entry.caseId}-${entry.bisId}`}
										className="space-y-2"
									>
										<a
											className="text-sm underline"
											href={`https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/${entry.bisId}`}
											target="_blank"
											rel="noreferrer"
										>
											BIS ieraksts {entry.bisId}
										</a>
										{entry.materials.length ? (
											entry.materials.map((m, i) => (
												<p className="text-sm" key={`${m.id}-${i}`}>
													{m.label}
												</p>
											))
										) : (
											<p className="text-sm">BIS ierakstam nav materiālu.</p>
										)}
									</div>
								))}
								<Button
									variant="outline"
									disabled={busy}
									onClick={() =>
										void update(() => refreshFimaBisMaterials(scope))
									}
								>
									Atjaunot no BIS
								</Button>
							</section>
						</div>
					) : (
						<FimaRecordHistory
							siteId={siteId}
							recordId={row.id}
							state={state}
							onChange={onChange}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
