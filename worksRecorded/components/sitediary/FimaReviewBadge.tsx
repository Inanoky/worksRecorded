"use client";

import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type FimaCollaboration,
	fimaStatuses,
} from "@/lib/fima/diary-collaboration";
import { useFimaReviewStatus } from "./useFimaReviewStatus";

const badgeTones = {
	do_not_create: "border-red-200 bg-red-50 text-red-700",
	needs_changes: "border-amber-200 bg-amber-50 text-amber-700",
	coordinate_with_fima: "border-violet-200 bg-violet-50 text-violet-700",
	ai_prepared: "border-yellow-200 bg-yellow-50 text-yellow-800",
	approved: "border-emerald-200 bg-emerald-100 text-emerald-800",
	ready_for_approval: "border-[#B8E0C6] bg-[#ECF8F0] text-[#159447]",
	unset: "border-[#E1E6ED] bg-slate-50 text-slate-600",
};
type Props = {
	siteId: string;
	recordId: string;
	state: FimaCollaboration;
	onChange: (id: string, state: FimaCollaboration) => void;
};
export function FimaReviewBadge(props: Props) {
	const { status, selectStatus, saving, recovering } =
		useFimaReviewStatus(props);
	return (
		<div aria-busy={saving} className="min-w-0">
			<Select
				value={status ?? "unset"}
				disabled={recovering}
				onValueChange={(value) =>
					selectStatus(
						value === "unset" ? null : (value as keyof typeof fimaStatuses),
					)
				}
			>
				<SelectTrigger
					aria-label="Ieraksta rīcība"
					data-fima-badge
					className="h-auto min-h-0 w-fit max-w-full gap-1 border-0 bg-transparent p-0 shadow-none [&>svg]:size-3"
					title="Organizācijas iekšējā rīcība. Izmaiņas saglabājas fonā; atzīme pati par sevi nesūta ierakstu uz BIS."
				>
					<SelectValue className="min-w-0 max-w-full overflow-hidden">
						<Badge
							variant="outline"
							className={`max-w-full min-w-0 shrink whitespace-nowrap overflow-hidden text-ellipsis px-1.5 text-[11px] text-left ${badgeTones[status ?? "unset"]}`}
						>
							{status ? fimaStatuses[status] : "Nav atzīmes"}
						</Badge>
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="unset">Nav atzīmes</SelectItem>
					{Object.entries(fimaStatuses).map(([key, label]) => (
						<SelectItem key={key} value={key}>
							{label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<span className="sr-only" aria-live="polite">
				{saving ? "Rīcība tiek saglabāta fonā" : ""}
			</span>
		</div>
	);
}
