export function getFimaBisCaseUrl(caseId: string | null | undefined) {
	return caseId && /^\d+$/.test(caseId)
		? `https://bis.gov.lv/bisp/lv/portal/bis_cases/${caseId}/logbook/logbooks`
		: null;
}
