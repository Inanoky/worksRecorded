export function getFimaBisCaseUrl(caseId: string | null | undefined) {
	return caseId && /^\d+$/.test(caseId)
		? `https://bis.gov.lv/bisp/lv/portal/bis_cases/${caseId}/logbook/logbooks`
		: null;
}
export function shouldOpenFimaRecordPanel(
	target: EventTarget | null,
	row: Element,
) {
	return (
		target instanceof Element &&
		row.contains(target) &&
		!target.closest(
			"a,button,input,textarea,select,[role='button'],[role='checkbox'],[role='combobox'],[role='menuitem'],[contenteditable='true'],[data-fima-interactive]",
		)
	);
}
