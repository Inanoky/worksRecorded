import { getFimaBisCaseUrl } from "./record-panel";

it("builds only validated BIS case links", () => {
	expect(getFimaBisCaseUrl("668714")).toBe(
		"https://bis.gov.lv/bisp/lv/portal/bis_cases/668714/logbook/logbooks",
	);
	expect(getFimaBisCaseUrl(undefined)).toBeNull();
	expect(getFimaBisCaseUrl("javascript:alert(1)")).toBeNull();
});
