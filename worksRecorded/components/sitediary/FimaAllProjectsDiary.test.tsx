import { fireEvent, render, screen, within } from "@testing-library/react";
import { FimaAllProjectsDiary } from "./FimaAllProjectsDiary";

jest.mock("./FimaMaterialRefresh", () => ({ FimaMaterialRefresh: () => null }));
jest.mock("./FimaInlineCell", () => ({
	FimaInlineCell: ({ value }: { value: unknown }) => (
		<span>{String(value ?? "")}</span>
	),
}));
jest.mock("./FimaDiaryCell", () => ({
	FimaDiaryCell: ({
		field,
		siteId,
		row,
		onOpenRecord,
	}: {
		field: string;
		siteId: string;
		row: { id: string };
		onOpenRecord?: () => void;
	}) => (
		<button
			type="button"
			data-site={siteId}
			data-record={row.id}
			onClick={onOpenRecord}
		>
			{field}
		</button>
	),
}));
jest.mock("./FimaRecordPanel", () => ({
	FimaRecordPanel: ({
		row,
		siteId,
	}: {
		siteId: string;
		row: { id: string } | null;
	}) =>
		row ? (
			<aside aria-label="Record panel">
				{siteId} {row.id}
			</aside>
		) : null,
}));
const records = [
	{
		id: "row-1",
		siteId: "site-1",
		Date: "2026-09-01",
		Works: "KUCE one",
		Works_Custom_1: "BIS one",
		Works_Custom_2: "19:00–05:00",
		Location: "21-9",
		Amounts: 2,
		Units: "gab.",
		BISId: "123",
		bisCaseId: "668714",
		Site: { name: "Olaine" },
	},
	{
		id: "row-2",
		siteId: "site-2",
		Date: "2026-09-02",
		Works: "KUCE two",
		Location: "21-5",
		Amounts: null,
		Units: null,
		Site: { name: "Torņakalns" },
	},
];
it("uses each record's actual project for collaboration and opens its right panel", () => {
	render(<FimaAllProjectsDiary records={records} />);
	const table = screen.getByRole("table");
	const rows = within(table).getAllByRole("row");
	expect(
		within(rows[1]).getByRole("button", { name: "FimaReviewStatus" }),
	).toHaveAttribute("data-site", "site-1");
	expect(
		within(rows[2]).getByRole("button", { name: "FimaReviewStatus" }),
	).toHaveAttribute("data-site", "site-2");
	fireEvent.click(rows[2]);
	expect(screen.getByLabelText("Record panel")).toHaveTextContent(
		"site-2 row-2",
	);
	fireEvent.click(
		within(rows[1]).getByRole("button", { name: "FimaComments" }),
	);
	expect(screen.getByLabelText("Record panel")).toHaveTextContent(
		"site-1 row-1",
	);
});
it("keeps action badges last, fits columns and omits removed source/labour columns", () => {
	const { container } = render(<FimaAllProjectsDiary records={records} />);
	const headers = screen.getAllByRole("columnheader");
	expect(headers.at(-1)).toHaveTextContent("Rīcība");
	for (const name of [
		"Importa pārbaude",
		"BIS atsauces",
		"Avots / piezīmes",
		"Strādnieki",
		"Cilvēkstundas",
	])
		expect(
			screen.queryByRole("columnheader", { name }),
		).not.toBeInTheDocument();
	expect(
		[...container.querySelectorAll("col")].reduce(
			(total, col) => total + Number.parseFloat(col.style.width),
			0,
		),
	).toBeCloseTo(100);
	expect(
		within(screen.getByRole("table")).getByRole("link", { name: "123" }),
	).toHaveAttribute(
		"href",
		"https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/123/edit?entry_ids%5B%5D=123",
	);
});
