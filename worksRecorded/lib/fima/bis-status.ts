export const fimaBisPendingStatuses = [
	"approving",
	"submitted_to_approve",
	"submitted",
	"pending",
	"pending_approval",
	"on_approval",
	"approval_in_progress",
	"ready_for_approval",
] as const;

export function getFimaBisStatus(status?: string | null) {
	const value = status?.trim().toLowerCase();
	if (!value) return "works_recorded";
	if (value === "approved") return "approved";
	return fimaBisPendingStatuses.some((pending) => pending === value)
		? "pending"
		: "draft";
}
