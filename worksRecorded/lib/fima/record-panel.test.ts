import { getFimaBisCaseUrl, shouldOpenFimaRecordPanel } from "./record-panel";

it("builds only validated BIS case links", () => {
	expect(getFimaBisCaseUrl("668714")).toBe(
		"https://bis.gov.lv/bisp/lv/portal/bis_cases/668714/logbook/logbooks",
	);
	expect(getFimaBisCaseUrl(undefined)).toBeNull();
	expect(getFimaBisCaseUrl("javascript:alert(1)")).toBeNull();
});
it("opens record text while leaving links, badges, checkboxes and portalled controls alone", () => {
	const table = document.createElement("table");
	table.innerHTML =
		'<tbody><tr><td><span>Darbs</span><a href="#">BIS</a><button>Labot</button><input type="checkbox"/><div role="combobox">Rīcība</div></td></tr></tbody>';
	const row = table.querySelector("tr");
	if (!row) throw new Error("Missing test row");
	expect(shouldOpenFimaRecordPanel(row.querySelector("span"), row)).toBe(true);
	for (const element of row.querySelectorAll("a,button,input,[role=combobox]"))
		expect(shouldOpenFimaRecordPanel(element, row)).toBe(false);
	expect(shouldOpenFimaRecordPanel(document.createElement("button"), row)).toBe(
		false,
	);
});
