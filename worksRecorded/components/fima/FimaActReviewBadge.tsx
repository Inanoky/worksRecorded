"use client";
import { History } from "lucide-react";
import { FimaStatusSelect } from "@/components/sitediary/FimaStatusSelect";
import type { FimaActRow } from "@/lib/fima/act-register";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";

export function FimaActReviewBadge({
	row,
	status,
	saving,
	onSelectStatus,
	onHistory,
}: {
	row: FimaActRow;
	status: FimaCollaboration["status"];
	saving: boolean;
	onSelectStatus: (status: FimaCollaboration["status"]) => void;
	onHistory: () => void;
}) {
	return (
		<FimaStatusSelect
			status={status}
			saving={saving}
			disabled={saving}
			selectStatus={onSelectStatus}
			label={`Akta rīcība ${row.localNumber}`}
			actor={
				saving
					? undefined
					: row.setting.history.findLast((event) => event.kind === "status")
			}
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
