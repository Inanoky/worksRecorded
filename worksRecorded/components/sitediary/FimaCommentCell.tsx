"use client";

import { Pencil } from "lucide-react";
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
				<div className="flex items-start gap-1">
					<button
						type="button"
						aria-label="Komentāri"
						className="min-h-8 min-w-0 flex-1 rounded px-1 py-1 text-left text-xs hover:bg-primary/5"
						title={latest ? `${latest.actorName} · ${latest.at}` : undefined}
						onClick={onOpenRecord}
					>
						{latest?.text}
					</button>
					<button
						type="button"
						aria-label="Pievienot komentāru rindā"
						className="mt-1 shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:bg-primary/5 group-hover:opacity-100 group-focus-within:opacity-100"
						onClick={() => setEditing(true)}
					>
						<Pencil className="size-3" />
					</button>
				</div>
			)}
		</div>
	);
}
