"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState } from "react";
import {
	type FimaCollaboration,
	fimaStatuses,
} from "@/lib/fima/diary-collaboration";
import { getFimaBisCaseUrl } from "@/lib/fima/record-panel";
import { FimaDiaryCell } from "./FimaDiaryCell";
import { FimaRecordHistory } from "./FimaRecordHistory";

type Row = {
	id?: string;
	Works?: string | null;
	Works_Custom_1?: string | null;
	Location?: string | null;
	Date?: string | Date | null;
	BISId?: string | null;
	fimaCollaboration?: FimaCollaboration;
};
type Props = {
	siteId: string;
	row: Row | null;
	caseId?: string | null;
	caseNumber?: string | null;
	onClose: () => void;
	onRestoreFocus?: () => void;
	onChange: (id: string, state: FimaCollaboration) => void;
};
const empty: FimaCollaboration = {
	version: 0,
	status: null,
	materials: [],
	history: [],
};
export function FimaRecordPanel({
	siteId,
	row,
	caseId,
	caseNumber,
	onClose,
	onRestoreFocus,
	onChange,
}: Props) {
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	const state = row?.fimaCollaboration ?? empty;
	const caseUrl = getFimaBisCaseUrl(caseId);
	const date = row?.Date ? new Date(row.Date) : null;
	return (
		<Dialog.Root
			modal={false}
			open={Boolean(row?.id)}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<Dialog.Portal>
				{row?.id ? (
					<Dialog.Content
						onInteractOutside={(event) => event.preventDefault()}
						onCloseAutoFocus={(event) => {
							event.preventDefault();
							onRestoreFocus?.();
						}}
						className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-[calc(100%-1rem)] flex-col border-l bg-background shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right sm:w-[29rem] sm:max-w-[29rem]"
					>
						<header className="relative space-y-1 border-b px-5 py-4 pr-14">
							<Dialog.Title className="text-lg font-semibold">
								Ieraksta pārskats
							</Dialog.Title>
							<Dialog.Description className="text-sm text-muted-foreground">
								KUCE darbs, BIS atsauces un organizācijas komentāru vēsture.
							</Dialog.Description>
							<Dialog.Close asChild>
								<button
									type="button"
									aria-label="Aizvērt ieraksta paneli"
									className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									<X className="size-4" />
								</button>
							</Dialog.Close>
						</header>
						<div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
							<section className="space-y-3 rounded-lg border bg-muted/20 p-4">
								<h2 className="whitespace-pre-wrap break-words font-semibold">
									{row.Works || "KUCE ieraksts"}
								</h2>
								<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
									<dt className="text-muted-foreground">Datums</dt>
									<dd>
										{date && Number.isFinite(date.getTime())
											? date.toLocaleDateString("lv-LV")
											: "—"}
									</dd>
									<dt className="text-muted-foreground">Balsti</dt>
									<dd className="break-words">{row.Location || "—"}</dd>
									<dt className="text-muted-foreground">Rīcība</dt>
									<dd>
										{state.status ? fimaStatuses[state.status] : "Nav atzīmes"}
									</dd>
								</dl>
								<div className="flex flex-wrap gap-3 text-sm">
									{caseUrl ? (
										<a
											className="break-words text-primary underline"
											href={caseUrl}
											target="_blank"
											rel="noopener noreferrer"
										>
											{caseNumber || `BIS lieta ${caseId}`}
										</a>
									) : null}
									{row.BISId && /^\d+$/.test(row.BISId) ? (
										<a
											className="text-primary underline"
											href={`https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/${row.BISId}/edit?entry_ids%5B%5D=${row.BISId}`}
											target="_blank"
											rel="noopener noreferrer"
										>
											Atvērt BIS ierakstu
										</a>
									) : null}
								</div>
							</section>
							{state.examples ? (
								<section className="space-y-2 rounded-lg border p-3">
									<h2 className="text-sm font-semibold">Paraugas</h2>
									<FimaDiaryCell
										field="FimaExamples"
										siteId={siteId}
										row={row}
										onChange={onChange}
									/>
								</section>
							) : null}
							<section className="space-y-2 rounded-lg border p-3">
								<h2 className="text-sm font-semibold">Materiāli</h2>
								<FimaDiaryCell
									key={`${siteId}-${row.id}-materials`}
									field="FimaMaterials"
									siteId={siteId}
									row={row}
									materialEditor
									onChange={onChange}
								/>
							</section>
							<FimaRecordHistory
								key={`${siteId}-${row.id}`}
								siteId={siteId}
								recordId={row.id}
								state={state}
								onChange={onChange}
								draft={drafts[row.id] ?? ""}
								onDraftChange={(value) => {
									const id = row.id;
									if (id) setDrafts((current) => ({ ...current, [id]: value }));
								}}
							/>
						</div>
					</Dialog.Content>
				) : null}
			</Dialog.Portal>
		</Dialog.Root>
	);
}
