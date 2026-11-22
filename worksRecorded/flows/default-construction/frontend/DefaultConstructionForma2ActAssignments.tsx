"use client";

import { useState } from "react";
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
import { getFimaActStatusLabel } from "@/lib/fima/acceptance-acts";
import { saveDefaultConstructionForma2ActAssignments } from "../backend/forma2-analytics-actions";
import type { Forma2ActCoverage } from "../lib/forma2-act-coverage";
import type { Forma2Position } from "../lib/forma2-analytics";
import { formatForma2PositionLabel } from "../lib/forma2-position-label";
import { useForma2Refresh } from "./forma2-client-refresh";

export function DefaultConstructionForma2ActAssignments({
	coverage,
	positions,
	siteId,
	filterPositionId,
	latvian,
	onClose,
	onSaved,
}: {
	coverage: Forma2ActCoverage;
	positions: Forma2Position[];
	siteId: string;
	filterPositionId: string;
	latvian: boolean;
	onClose: () => void;
	onSaved?: (
		update: Awaited<
			ReturnType<typeof saveDefaultConstructionForma2ActAssignments>
		>,
	) => void;
}) {
	const refresh = useForma2Refresh(siteId);
	const [search, setSearch] = useState("");
	const [changes, setChanges] = useState<Record<string, string | null>>({});
	const [saving, setSaving] = useState(false);
	const [showAll, setShowAll] = useState(!filterPositionId);
	const [editingKey, setEditingKey] = useState<string | null>(null);
	const workPositions = positions.filter(
		(position) => position.kind === "work",
	);
	const positionLabels = new Map(
		workPositions.map((position) => [
			position.id,
			formatForma2PositionLabel(position),
		]),
	);
	const query = search.trim().toLowerCase();
	const acts = coverage.acts.filter(
		(act) =>
			(showAll || act.positionId === filterPositionId) &&
			(!query ||
				`${act.label} ${act.title ?? ""}`.toLowerCase().includes(query)),
	);
	const save = async () => {
		setSaving(true);
		try {
			const update = await saveDefaultConstructionForma2ActAssignments({
				siteId,
				caseId: coverage.caseId,
				documentId: coverage.documentId,
				changes: Object.entries(changes).map(([actKey, positionId]) => ({
					actKey,
					positionId,
				})),
			});
			if (onSaved) onSaved(update);
			else refresh();
			onClose();
		} catch {
			toast.error(
				latvian
					? "Neizdevās saglabāt aktu piesaisti. Atjaunojiet lapu."
					: "Could not save act assignments. Refresh and try again.",
			);
		} finally {
			setSaving(false);
		}
	};
	const copy = latvian
		? {
				title: "BIS aktu piesaiste",
				description:
					"Izpildes segumā ieskaita tikai apstiprinātos aktus un darbus, kas ietilpst izvēlētās pozīcijas izpildē.",
				search: "Meklēt aktu",
				all: "Rādīt visus aktus",
				selected: "Rādīt tikai pozīcijas aktus",
				empty: "Akti nav atrasti.",
				unassigned: "Nav piesaistīts",
				save: "Saglabāt piesaisti",
			}
		: {
				title: "BIS act assignments",
				description:
					"Coverage counts approved acts and work included in the selected position’s execution.",
				search: "Search acts",
				all: "Show all acts",
				selected: "Show acts for this position",
				empty: "No acts found.",
				unassigned: "Unassigned",
				save: "Save assignments",
			};

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !saving) onClose();
			}}
		>
			<DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>{copy.title}</DialogTitle>
					<DialogDescription>{copy.description}</DialogDescription>
				</DialogHeader>
				<div className="flex flex-wrap items-center gap-2">
					<Input
						className="w-auto flex-1"
						type="search"
						aria-label={copy.search}
						placeholder={copy.search}
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
					{filterPositionId ? (
						<Button
							type="button"
							variant="outline"
							onClick={() => setShowAll(!showAll)}
						>
							{showAll ? copy.selected : copy.all}
						</Button>
					) : null}
				</div>
				<ul className="min-h-0 divide-y overflow-y-auto">
					{acts.map((act) => {
						const selectedPositionId = Object.hasOwn(changes, act.key)
							? changes[act.key]
							: act.positionId;
						return (
							<li
								key={act.key}
								className="grid gap-2 py-3 sm:grid-cols-2 sm:items-center"
							>
								<div className="min-w-0">
									<a
										className="font-medium underline underline-offset-2"
										href={act.url}
										target="_blank"
										rel="noreferrer"
									>
										{act.label}
									</a>
									{act.title ? (
										<p className="line-clamp-2 text-sm">{act.title}</p>
									) : null}
									<p className="text-xs text-muted-foreground">
										{latvian
											? getFimaActStatusLabel(act.status)
											: act.status.replaceAll("_", " ")}
										{act.positionId && !Object.hasOwn(changes, act.key) ? (
											<>
												{" "}
												· {latvian ? "Darbi pozīcijā" : "Works in position"}{" "}
												{act.matchedWorks}/{act.nativeWorks}
											</>
										) : null}
									</p>
								</div>
								{editingKey === act.key ? (
									<select
										className="h-9 min-w-0 rounded-md border bg-background px-2 text-sm"
										aria-label={`${copy.title} ${act.label}`}
										value={selectedPositionId ?? ""}
										disabled={saving}
										onChange={(event) => {
											const positionId = event.target.value || null;
											setChanges((previous) => {
												const next = { ...previous };
												if (positionId === act.positionId) delete next[act.key];
												else next[act.key] = positionId;
												return next;
											});
											setEditingKey(null);
										}}
									>
										<option value="">{copy.unassigned}</option>
										{workPositions.map((position) => (
											<option key={position.id} value={position.id}>
												{formatForma2PositionLabel(position)}
											</option>
										))}
									</select>
								) : (
									<Button
										type="button"
										variant="outline"
										className="h-auto min-h-9 justify-start whitespace-normal text-left"
										aria-label={`${copy.title} ${act.label}`}
										disabled={saving}
										onClick={() => setEditingKey(act.key)}
									>
										{(selectedPositionId &&
											positionLabels.get(selectedPositionId)) ||
											copy.unassigned}
									</Button>
								)}
							</li>
						);
					})}
				</ul>
				{!acts.length ? (
					<p className="py-4 text-center text-sm text-muted-foreground">
						{copy.empty}
					</p>
				) : null}
				<DialogFooter>
					<Button
						type="button"
						disabled={saving || !Object.keys(changes).length}
						onClick={() => void save()}
					>
						{copy.save}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
