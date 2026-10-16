import { Badge } from "@/components/ui/badge";
import { getSiteDiaryListMessages } from "@/lib/dashboard-i18n";

export function FimaBisState({
	status,
	language = "lv",
}: {
	status?: string | null;
	language?: string;
}) {
	const t = getSiteDiaryListMessages(language);
	const value = (status ?? "").trim().toLowerCase();
	const pending = [
		"approving",
		"submitted_to_approve",
		"submitted",
		"pending",
		"pending_approval",
		"on_approval",
		"approval_in_progress",
		"ready_for_approval",
	].includes(value);
	const label = !value
		? "WorksRecorded"
		: value === "approved"
			? t.bisApproved
			: pending
				? t.bisPending
				: t.bisDraft;
	const tone = !value
		? "border border-slate-200 bg-slate-50 text-slate-700"
		: value === "approved"
			? "border border-emerald-200 bg-emerald-50 text-emerald-700"
			: pending
				? "border border-sky-200 bg-sky-50 text-sky-700"
				: "border border-blue-200 bg-blue-50 text-blue-700";
	return (
		<Badge
			className={`inline-flex items-center justify-center rounded-full px-3 py-1 font-medium capitalize ${tone}`}
		>
			{label}
		</Badge>
	);
}
