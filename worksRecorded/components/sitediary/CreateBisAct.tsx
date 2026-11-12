"use client";

import { FilePlus2, Loader2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import type { DiaryActPreparation } from "@/lib/bis/diary-act";

export function CreateBisAct({
	siteId,
	recordIds,
	allApproved,
	onCreated,
}: {
	siteId: string;
	recordIds: string[];
	allApproved: boolean;
	onCreated: () => void;
}) {
	const idPrefix = useId();
	const [open, setOpen] = useState(false);
	const [kind, setKind] = useState<"certificate" | "covered">("certificate");
	const [preparation, setPreparation] = useState<DiaryActPreparation | null>(
		null,
	);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [result, setResult] = useState<{ id: string; url: string } | null>(
		null,
	);
	const [estimateByRecord, setEstimateByRecord] = useState<
		Record<string, string>
	>({});
	const [caseActId, setCaseActId] = useState("");
	const selection = useRef<string[]>([]);
	const requestId = useRef("");
	const epoch = useRef(0);
	const busy = useRef(false);
	const load = async (nextKind: "certificate" | "covered") => {
		const version = ++epoch.current;
		setKind(nextKind);
		setPreparation(null);
		setLoading(true);
		setError("");
		setCaseActId("");
		requestId.current = crypto.randomUUID();
		try {
			const { reviewConstructionBisAct } = await import(
				"@/server/actions/construction-bis-acts"
			);
			const reviewed = await reviewConstructionBisAct({
				siteId,
				recordIds: selection.current,
				kind: nextKind,
			});
			if (!reviewed.ok) throw new Error(reviewed.error);
			const next = reviewed.data;
			if (epoch.current !== version) return;
			setPreparation(next);
			setEstimateByRecord(
				Object.fromEntries(
					next.works.map((work) => [work.recordId, work.estimateId]),
				),
			);
		} catch (failure) {
			if (epoch.current === version)
				setError(
					failure instanceof Error
						? failure.message
						: "Neizdevās pārbaudīt BIS ierakstus.",
				);
		} finally {
			if (epoch.current === version) setLoading(false);
		}
	};
	return (
		<>
			<Button
				type="button"
				size="sm"
				variant="outline"
				disabled={!allApproved || recordIds.length > 30}
				title={
					!allApproved
						? "Atlasiet tikai BIS apstiprinātus ierakstus."
						: recordIds.length > 30
							? "Vienā aktā atlasiet līdz 30 ierakstiem."
							: undefined
				}
				onClick={() => {
					selection.current = [...recordIds];
					setResult(null);
					setOpen(true);
					void load("certificate");
				}}
			>
				<FilePlus2 className="mr-2 size-4" />
				Izveidot aktu ({recordIds.length})
			</Button>
			<Dialog
				open={open}
				onOpenChange={(value) => {
					if (busy.current) return;
					if (!value) ++epoch.current;
					setOpen(value);
				}}
			>
				<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>Izveidot aktu BIS</DialogTitle>
						<DialogDescription>
							Akts tiks izveidots kā melnraksts no atlasītajiem BIS
							apstiprinātajiem darbiem. Apstiprināšanu turpiniet BIS.
						</DialogDescription>
					</DialogHeader>
					{result ? (
						<div className="space-y-4">
							<p>Akts Nr. {result.id} izveidots.</p>
							<Button asChild>
								<a href={result.url} target="_blank" rel="noreferrer">
									Atvērt aktu BIS
								</a>
							</Button>
						</div>
					) : (
						<>
							<label className="space-y-1 text-sm">
								Akta veids
								<select
									className="h-10 w-full rounded-md border bg-background px-3"
									value={kind}
									disabled={saving}
									onChange={(event) => {
										void load(event.target.value as typeof kind);
									}}
								>
									<option value="certificate">Darbu pieņemšanas akts</option>
									<option value="covered">Segto darbu pieņemšanas akts</option>
								</select>
							</label>
							{loading ? (
								<div
									aria-live="polite"
									className="flex items-center gap-2 py-8 text-sm"
								>
									<Loader2 className="size-4 animate-spin" />
									Pārbauda apstiprinājumu, apjomus un tāmes pozīcijas BIS…
								</div>
							) : null}
							{preparation ? (
								<form
									key={`${kind}:${preparation.revision}`}
									onSubmit={async (event) => {
										event.preventDefault();
										if (busy.current) return;
										const data = new FormData(event.currentTarget);
										const text = (name: string) =>
											String(data.get(name) ?? "").trim();
										busy.current = true;
										setSaving(true);
										setError("");
										try {
											const { submitConstructionBisAct } = await import(
												"@/server/actions/construction-bis-acts"
											);
											const submitted = await submitConstructionBisAct({
												siteId,
												requestId: requestId.current,
												recordIds: selection.current,
												kind,
												eventDate: text("eventDate"),
												eventTime: text("eventTime"),
												name: text("name"),
												description: text("description"),
												mark: text("mark"),
												code: text("code"),
												caseActId,
												estimateByRecord,
												revision: preparation.revision,
											});
											if (!submitted.ok) throw new Error(submitted.error);
											const next = submitted.data;
											setResult(next);
											if ("warning" in next && next.warning)
												toast.warning(next.warning);
											else toast.success("Akts izveidots BIS.");
											onCreated();
										} catch (failure) {
											setError(
												failure instanceof Error
													? failure.message
													: "Neizdevās izveidot aktu.",
											);
										} finally {
											busy.current = false;
											setSaving(false);
										}
									}}
								>
									<fieldset disabled={saving} className="space-y-4">
										<label
											className="block space-y-1 text-sm"
											htmlFor={`${idPrefix}-eventDate`}
										>
											Akta datums
											<Input
												id={`${idPrefix}-eventDate`}
												name="eventDate"
												type="date"
												required
												min={preparation.works
													.map((work) => work.date)
													.sort()
													.at(-1)}
												defaultValue={[
													new Date().toLocaleDateString("sv-SE"),
													...preparation.works.map((work) => work.date),
												]
													.sort()
													.at(-1)}
											/>
										</label>
										<label
											htmlFor={`${idPrefix}-eventTime`}
											className="block space-y-1 text-sm"
										>
											Akta laiks
											<Input
												id={`${idPrefix}-eventTime`}
												name="eventTime"
												type="time"
												required
												defaultValue={new Date().toLocaleTimeString("lv-LV", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											/>
										</label>
										<div className="space-y-3 rounded-md border p-3">
											{preparation.works.map((work) => (
												<div
													key={work.recordId}
													className="space-y-1 border-b pb-3 last:border-0 last:pb-0"
												>
													<div className="flex items-start justify-between gap-4 text-sm">
														<span>
															{work.description}
															<span className="block text-xs text-muted-foreground">
																{work.date} · BIS {work.bisId} · Apstiprināts
															</span>
														</span>
														<span className="shrink-0 font-medium">
															{work.quantity}
														</span>
													</div>
													{kind === "certificate" ? (
														<label className="block text-xs">
															BIS tāmes pozīcija
															<select
																className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm"
																required
																value={estimateByRecord[work.recordId] ?? ""}
																onChange={(event) =>
																	setEstimateByRecord((old) => ({
																		...old,
																		[work.recordId]: event.target.value,
																	}))
																}
															>
																<option value="">Izvēlieties pozīciju</option>
																{preparation.estimates
																	.filter(
																		(estimate) =>
																			!work.measurement ||
																			!estimate.measure ||
																			work.measurement === estimate.measure,
																	)
																	.map((estimate) => (
																		<option
																			key={estimate.id}
																			value={estimate.id}
																		>
																			{estimate.label}
																		</option>
																	))}
															</select>
														</label>
													) : null}
												</div>
											))}
										</div>
										{kind === "covered" ? (
											<>
												<label
													className="block space-y-1 text-sm"
													htmlFor={`${idPrefix}-caseActId`}
												>
													BIS pieņemšanas darbu plāna pozīcija
													{preparation.plans.length ? (
														<select
															className="h-10 w-full rounded-md border bg-background px-3"
															value={caseActId}
															onChange={(event) =>
																setCaseActId(event.target.value)
															}
														>
															<option value="">
																Izvēlieties vai ievadiet ID zemāk
															</option>
															{preparation.plans.map((plan) => (
																<option key={plan.id} value={plan.id}>
																	{plan.label} ({plan.id})
																</option>
															))}
														</select>
													) : null}
													<Input
														id={`${idPrefix}-caseActId`}
														aria-label="BIS pieņemšanas darbu plāna pozīcijas ID"
														required
														inputMode="numeric"
														pattern="[1-9][0-9]*"
														value={caseActId}
														onChange={(event) =>
															setCaseActId(event.target.value)
														}
														placeholder="BIS plāna pozīcijas ID"
													/>
												</label>
												<p className="text-xs text-muted-foreground">
													BIS API prasa pieņemšanas darbu plāna pozīcijas ID.
													Iepriekš izmantotās pozīcijas pieejamas sarakstā;
													jaunai pozīcijai norādiet tās ID no BIS.
												</p>
												<label
													className="block space-y-1 text-sm"
													htmlFor={`${idPrefix}-name`}
												>
													Akta nosaukums
													<Input
														id={`${idPrefix}-name`}
														name="name"
														required
														maxLength={200}
													/>
												</label>
												<label
													className="block space-y-1 text-sm"
													htmlFor={`${idPrefix}-description`}
												>
													Apraksts
													<Textarea
														id={`${idPrefix}-description`}
														name="description"
														required
														maxLength={5000}
														defaultValue={preparation.works
															.map((work) => work.description)
															.join("\n")}
													/>
												</label>
												<div className="grid grid-cols-2 gap-3">
													<label
														className="space-y-1 text-sm"
														htmlFor={`${idPrefix}-mark`}
													>
														Marka
														<Input
															id={`${idPrefix}-mark`}
															name="mark"
															maxLength={50}
														/>
													</label>
													<label
														className="space-y-1 text-sm"
														htmlFor={`${idPrefix}-code`}
													>
														Kods
														<Input
															id={`${idPrefix}-code`}
															name="code"
															maxLength={50}
														/>
													</label>
												</div>
											</>
										) : null}
									</fieldset>
									<DialogFooter className="mt-4">
										<Button
											type="button"
											variant="outline"
											disabled={saving}
											onClick={() => {
												++epoch.current;
												setOpen(false);
											}}
										>
											Atcelt
										</Button>
										<Button type="submit" disabled={saving}>
											{saving ? (
												<Loader2 className="mr-2 size-4 animate-spin" />
											) : null}
											{saving ? "Veido aktu BIS…" : "Izveidot melnrakstu BIS"}
										</Button>
									</DialogFooter>
								</form>
							) : null}
							{error ? (
								<div
									role="alert"
									className="space-y-2 text-sm text-destructive"
								>
									<p>{error}</p>
									{!preparation && !loading ? (
										<Button
											variant="outline"
											onClick={() => {
												void load(kind);
											}}
										>
											Mēģināt vēlreiz
										</Button>
									) : null}
								</div>
							) : null}
						</>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
