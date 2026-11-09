import { Badge } from "@/components/ui/badge";
import { getSiteDiaryListMessages } from "@/lib/dashboard-i18n";
import { getFimaBisStatus } from "@/lib/fima/bis-status";

export function FimaBisState({
	status,
	language = "lv",
	label: customLabel,
}: {
	status?: string | null;
	language?: string;
	label?: string;
}) {
	const t = getSiteDiaryListMessages(language);
	const value = getFimaBisStatus(status);
	const labels = {
		works_recorded: "WorksRecorded",
		approved: t.bisApproved,
		pending: t.bisPending,
		draft: t.bisDraft,
		deleted: t.bisDeleted,
	};
	const tones = {
		works_recorded: "border border-slate-200 bg-slate-50 text-slate-700",
		approved: "border border-emerald-200 bg-emerald-50 text-emerald-700",
		pending: "border border-sky-200 bg-sky-50 text-sky-700",
		draft: "border border-blue-200 bg-blue-50 text-blue-700",
		deleted: "border border-slate-200 bg-slate-100 text-slate-700",
	};
	const label =
		value === "deleted" ? labels.deleted : (customLabel ?? labels[value]);
	return (
		<Badge
			className={`block w-fit max-w-full min-w-0 whitespace-normal [overflow-wrap:anywhere] rounded-xl px-2 py-1 text-center font-medium leading-snug ${tones[value]}`}
			title={label}
		>
			{label}
		</Badge>
	);
}
