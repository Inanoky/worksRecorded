"use client";

import { useState } from "react";
import type { FimaBisExamples } from "@/lib/fima/bis-examples";
import { formatFimaDiaryNumber } from "@/lib/fima/diary-number";
import type {
	FimaExampleSource,
	FimaExampleSources,
} from "@/lib/fima/example-sources";
import { FimaExampleSourcePanel } from "./FimaExampleSourcePanel";

function SourceWork({
	source,
	onOpen,
}: {
	source: FimaExampleSource;
	onOpen: () => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const canExpand =
		source.work.length > 120 || source.work.split("\n").length > 2;
	return (
		<div className="space-y-1 border-l-2 border-muted pl-2">
			<p className="font-medium text-muted-foreground">KUCE avots:</p>
			<p
				className={`whitespace-pre-wrap break-words leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
			>
				{source.work || "Darba apraksts nav norādīts."}
			</p>
			{canExpand ? (
				<button
					type="button"
					aria-expanded={expanded}
					onClick={(event) => {
						event.stopPropagation();
						setExpanded((value) => !value);
					}}
					className="text-primary underline underline-offset-2"
				>
					{expanded ? "Mazāk" : "Vairāk"}
				</button>
			) : null}
			<button
				type="button"
				onClick={(event) => {
					event.stopPropagation();
					onOpen();
				}}
				className="block text-left text-primary underline underline-offset-2"
			>
				{source.fimaNumber
					? `${formatFimaDiaryNumber(source.fimaNumber)} · `
					: ""}
				Skatīt avotu
			</button>
		</div>
	);
}

function SourceWorks({
	sources,
	onOpen,
}: {
	sources: FimaExampleSource[];
	onOpen: (source: FimaExampleSource) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const visible = expanded ? sources : sources.slice(0, 2);
	return (
		<>
			{visible.map((source) => (
				<SourceWork
					key={source.id}
					source={source}
					onOpen={() => onOpen(source)}
				/>
			))}
			{sources.length > 2 ? (
				<button
					type="button"
					aria-expanded={expanded}
					onClick={(event) => {
						event.stopPropagation();
						setExpanded((value) => !value);
					}}
					className="text-left text-primary underline underline-offset-2"
				>
					{expanded
						? "Rādīt mazāk avotu"
						: `Visi KUCE avoti (${sources.length})`}
				</button>
			) : null}
		</>
	);
}

export function FimaExamplesCell({
	siteId,
	recordId,
	examples,
	sources,
}: {
	siteId: string;
	recordId?: string;
	examples: FimaBisExamples;
	sources?: FimaExampleSources;
}) {
	const [selected, setSelected] = useState<{
		bisId: string;
		source: FimaExampleSource;
	} | null>(null);
	return (
		<div className="space-y-2 text-xs" data-fima-interactive>
			{examples.note ? (
				<p className="whitespace-pre-wrap text-muted-foreground">
					{examples.note}
				</p>
			) : null}
			{examples.entries.length ? (
				<ul className="space-y-3">
					{examples.entries.map((entry) => (
						<li
							key={entry.url}
							className="space-y-2 rounded-md border bg-muted/10 p-2"
						>
							<a
								href={entry.url}
								target="_blank"
								rel="noopener noreferrer"
								onClick={(event) => event.stopPropagation()}
								className="whitespace-normal font-medium leading-relaxed text-primary underline underline-offset-2"
							>
								{entry.label}
							</a>
							{sources?.[entry.id]?.length ? (
								<SourceWorks
									sources={sources[entry.id]}
									onOpen={(source) => setSelected({ bisId: entry.id, source })}
								/>
							) : (
								<p className="text-muted-foreground">
									KUCE avots nav pieejams.
								</p>
							)}
						</li>
					))}
				</ul>
			) : null}
			{selected && recordId ? (
				<FimaExampleSourcePanel
					key={`${selected.bisId}:${selected.source.id}`}
					siteId={siteId}
					recordId={recordId}
					bisId={selected.bisId}
					sourceRecordId={selected.source.id}
					onClose={() => setSelected(null)}
				/>
			) : null}
		</div>
	);
}
