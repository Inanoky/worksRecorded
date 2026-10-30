"use client";
import { History } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FimaStatusSelect } from "@/components/sitediary/FimaStatusSelect";
import type { FimaActRow, FimaActSetting } from "@/lib/fima/act-register";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import { saveFimaActSettings } from "@/server/actions/fima-acts";

export function FimaActReviewBadge({
	row,
	onSaved,
	onHistory,
}: {
	row: FimaActRow;
	onSaved: (setting: FimaActSetting) => void;
	onHistory: () => void;
}) {
	const [saving, setSaving] = useState(false);
	const pending = useRef(false);
	const request = useRef<{
		status: FimaCollaboration["status"];
		id: string;
	} | null>(null);
	const save = async (status: FimaCollaboration["status"]) => {
		if (pending.current) return;
		pending.current = true;
		setSaving(true);
		if (!request.current || request.current.status !== status)
			request.current = { status, id: crypto.randomUUID() };
		try {
			onSaved(
				await saveFimaActSettings({
					siteId: row.siteId,
					collection: row.collection,
					id: row.id,
					expectedRevision: row.setting.revision,
					requestId: request.current.id,
					kind: "status",
					status,
				}),
			);
			request.current = null;
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Neizdevās saglabāt atzīmi.",
			);
		} finally {
			pending.current = false;
			setSaving(false);
		}
	};
	return (
		<FimaStatusSelect
			status={row.setting.status ?? null}
			saving={saving}
			disabled={saving}
			selectStatus={(status) => void save(status)}
			label={`Akta rīcība ${row.localNumber}`}
			actor={row.setting.history.findLast((event) => event.kind === "status")}
			history={
				<button
					type="button"
					aria-label={`Atzīmju vēsture ${row.localNumber}`}
					onClick={onHistory}
					className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<History className="size-3" />
				</button>
			}
		/>
	);
}
