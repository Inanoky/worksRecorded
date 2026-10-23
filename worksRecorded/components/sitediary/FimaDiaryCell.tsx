"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { readFimaBisExamples } from "@/lib/fima/bis-examples";
import {
	getFimaBisRecordUrl,
	readFimaBisRecordLinks,
} from "@/lib/fima/bis-record-links";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import type { FimaExampleSources } from "@/lib/fima/example-sources";
import { FimaCommentCell } from "./FimaCommentCell";
import { FimaExamplesCell } from "./FimaExamplesCell";
import { FimaMaterialPicker } from "./FimaMaterialPicker";
import { FimaNumberCell } from "./FimaNumberCell";
import { FimaRecordHistory } from "./FimaRecordHistory";
import { FimaReviewBadge } from "./FimaReviewBadge";

type Props = {
	field: string;
	siteId: string;
	row: {
		id?: string;
		BISId?: string | null;
		fimaCollaboration?: FimaCollaboration;
		fimaExampleSources?: FimaExampleSources;
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
	const state = row.fimaCollaboration ?? empty;
	if (field === "FimaNumber") {
		return <FimaNumberCell value={row.fimaNumber} />;
	}
	if (field === "FimaExamples") {
		const examples = readFimaBisExamples(state.examples, state.history);
		if (!examples) return null;
		return (
			<FimaExamplesCell
				siteId={siteId}
				recordId={row.id}
				examples={examples}
				sources={row.fimaExampleSources}
			/>
		);
	}
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
	const recordId = row.id;
	if (field === "FimaConfidence") {
		const approved =
			row.bisStatus === "approved" &&
			(Boolean(row.BISId) ||
				(Array.isArray(row.fimaBisRecords) && row.fimaBisRecords.length > 0));
		const confidence = approved
			? {
					level: 100,
					basis: "Ierakstam ir piesaistīts apstiprināts BIS ieraksts.",
				}
			: state.confidence;
		return confidence ? (
			<span
				title={confidence.basis}
				className="text-xs font-medium tabular-nums whitespace-nowrap"
			>
				{confidence.level}%<span className="sr-only"> {confidence.basis}</span>
			</span>
		) : (
			<span title="Nepietiek pārbaudītu datu vērtējumam.">—</span>
		);
	}
	if (field === "FimaReviewStatus")
		return (
			<FimaReviewBadge
				key={`${siteId}-${recordId}`}
				siteId={siteId}
				recordId={recordId}
				state={state}
				onChange={onChange}
			/>
		);
	if (field === "FimaMaterials") {
		const materialNoteLines =
			state.materialsNote
				?.split(/\r?\n/)
				.map((line) => line.trim())
				.filter(Boolean) ?? [];
		const preparedIds = new Set(state.materials.map((material) => material.id));
		const materials = [
			...state.materials,
			...(
				state.bisMaterials?.entries.flatMap((entry) => entry.materials) ?? []
			).filter((material) => !preparedIds.has(material.id)),
		];
		return (
			<>
				<div className="group flex min-w-0 items-start gap-1">
					{materialEditor ? (
						<Button variant="outline" size="sm" onClick={() => setOpen(true)}>
							Pārvaldīt materiālus
						</Button>
					) : (
						<>
							<div className="min-w-0 flex-1 cursor-text select-text">
								{materials.length ? (
									<ul className="list-disc space-y-2 pl-4 text-xs marker:text-primary">
										{materials.map((material, index) => (
											<li key={`${material.id}-${index}`}>
												<span className="whitespace-normal leading-relaxed">
													{material.label} · {material.quantity} {material.unit}
												</span>
											</li>
										))}
									</ul>
								) : materialNoteLines.length > 1 ? (
									<ul className="list-disc space-y-2 pl-4 text-xs text-muted-foreground marker:text-primary">
										{materialNoteLines.map((line, index) => (
											<li key={`${index}-${line}`}>
												<span className="whitespace-normal leading-relaxed">
													{line}
												</span>
											</li>
										))}
									</ul>
								) : (
									<span className="text-xs text-muted-foreground">
										{state.materialsNote}
									</span>
								)}
							</div>
							<button
								type="button"
								aria-label={
									materials.length || state.materialsNote
										? "Rediģēt materiālus"
										: "Pievienot materiālus"
								}
								className="shrink-0 rounded p-1 text-muted-foreground opacity-60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100"
								onClick={() => setOpen(true)}
							>
								<Pencil className="size-3" aria-hidden="true" />
							</button>
						</>
					)}
				</div>
				<Dialog
					open={open}
					onOpenChange={(value) => {
						if (!busy) setOpen(value);
					}}
				>
					{open ? (
						<FimaMaterialPicker
							key={`${siteId}-${recordId}`}
							siteId={siteId}
							recordId={recordId}
							state={state}
							onChange={onChange}
							onClose={() => setOpen(false)}
							onSavingChange={setBusy}
						/>
					) : null}
				</Dialog>
			</>
		);
	}
	return (
		<>
			<FimaCommentCell
				siteId={siteId}
				recordId={recordId}
				state={state}
				onChange={onChange}
				onOpenRecord={() => {
					if (onOpenRecord) onOpenRecord();
					else setOpen(true);
				}}
			/>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Komentāri un izmaiņu vēsture</DialogTitle>
						<DialogDescription>
							Organizācijas dalībnieku komentāri un rīcības izmaiņas tiek
							saglabātas ar autoru un laiku.
						</DialogDescription>
					</DialogHeader>
					<FimaRecordHistory
						siteId={siteId}
						recordId={recordId}
						state={state}
						onChange={onChange}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}
