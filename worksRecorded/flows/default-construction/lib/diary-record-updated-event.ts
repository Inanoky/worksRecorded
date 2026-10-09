export const DIARY_RECORD_UPDATED = "worksrecorded:diary-record-updated";

export function notifyDiaryRecordUpdated(siteId: string) {
	window.dispatchEvent(
		new CustomEvent(DIARY_RECORD_UPDATED, { detail: { siteId } }),
	);
}
