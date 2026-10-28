"use client";

import { MessageSquare, Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import { saveFimaDiaryCollaboration } from "@/server/actions/fima-diary-collaboration";

export function FimaCommentCell({
	siteId,
	recordId,
	state,
	onOpenRecord,
	onChange,
}: {
	siteId: string;
	recordId: string;
	state: FimaCollaboration;
	onOpenRecord: () => void;
	onChange: (id: string, state: FimaCollaboration) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");
	const [saving, setSaving] = useState(false);
	const requestId = useRef<string | null>(null);
	const latest = state.history.findLast((event) => event.kind === "comment");
	const save = async () => {
		if (!draft.trim() || saving) return;
		requestId.current ??= crypto.randomUUID();
		setSaving(true);
		try {
			const result = await saveFimaDiaryCollaboration({
				siteId,
				recordId,
				kind: "comment",
				text: draft,
				requestId: requestId.current,
			});
			onChange(recordId, result);
			setEditing(false);
			setDraft("");
			requestId.current = null;
		} catch (cause) {
			toast.error(
				cause instanceof Error
					? cause.message
					: "Neizdevās saglabāt komentāru.",
			);
		} finally {
			setSaving(false);
		}
	};
	return (
		<div className="group min-h-8 min-w-0" data-fima-interactive>
			{editing ? (
				<div className="space-y-2">
					<textarea
						aria-label="Jauns komentārs rindā"
						className="w-full rounded border bg-background p-2 text-xs"
						rows={3}
						value={draft}
						disabled={saving}
						onChange={(event) => {
							setDraft(event.target.value);
							requestId.current = null;
						}}
					/>
					<div className="flex flex-wrap gap-1">
						<Button
							size="sm"
							disabled={saving || !draft.trim()}
							onClick={() => void save()}
						>
							Saglabāt
						</Button>
						<Button
							size="sm"
							variant="ghost"
							disabled={saving}
							onClick={() => setEditing(false)}
						>
							Atcelt
						</Button>
					</div>
				</div>
			) : (
				<div className="min-w-0 space-y-2">
					{latest ? (
						<div className="min-w-0 rounded-md border bg-muted/20 px-2 py-1.5">
							<p className="cursor-text select-text whitespace-pre-wrap text-xs leading-relaxed [overflow-wrap:anywhere]">
								{latest.text}
							</p>
							<p
								className="mt-1 truncate text-[10px] text-muted-foreground"
								title={`${latest.actorName} · ${latest.at}`}
							>
								{latest.actorName}
							</p>
						</div>
					) : null}
					<div className="flex flex-wrap items-center gap-1">
						<button
							type="button"
							aria-label="Komentāri"
							title="Atvērt visus komentārus"
							className="inline-flex items-center gap-1 rounded p-1 text-[11px] text-muted-foreground hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
							onClick={onOpenRecord}
						>
							<MessageSquare className="size-3" aria-hidden="true" />
							{latest ? <span>Visi</span> : null}
						</button>
						<button
							type="button"
							aria-label="Pievienot komentāru rindā"
							title="Pievienot komentāru rindā"
							className="inline-flex items-center gap-1 rounded p-1 text-[11px] text-muted-foreground hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
							onClick={() => setEditing(true)}
						>
							<Pencil className="size-3" aria-hidden="true" />
							<span>Pievienot</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
