import { fireEvent, render, screen, within } from "@testing-library/react";
import { withFimaDiaryColumns } from "@/lib/fima/diary-collaboration";
import {
	fimaDiaryColumnWeights,
	fimaDiaryTableClassName,
} from "@/lib/fima/diary-table";
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
const tableFor = (work: string) => {
	const table = screen
		.getAllByRole("table")
		.find((item) => within(item).queryByText(work));
	if (!table) throw new Error(`No table for ${work}`);
	return table;
};
it("uses each record's actual project for collaboration and opens its right panel", () => {
	render(<FimaAllProjectsDiary records={records} />);
	const first = within(tableFor("KUCE one")).getAllByRole("row")[1];
	const second = within(tableFor("KUCE two")).getAllByRole("row")[1];
	expect(
		within(first).getByRole("button", { name: "FimaReviewStatus" }),
	).toHaveAttribute("data-site", "site-1");
	expect(
		within(second).getByRole("button", { name: "FimaReviewStatus" }),
	).toHaveAttribute("data-site", "site-2");
	fireEvent.click(second);
	expect(screen.getByLabelText("Record panel")).toHaveTextContent(
		"site-2 row-2",
	);
	fireEvent.click(within(first).getByRole("button", { name: "FimaComments" }));
	expect(screen.getByLabelText("Record panel")).toHaveTextContent(
		"site-1 row-1",
	);
});

it("uses individual-project columns and spacing, adding only the project column", () => {
	render(<FimaAllProjectsDiary records={records} />);
	const config = withFimaDiaryColumns(
		{ otherSettings: { fimaCollaboration: true } },
		null,
	);
	const sharedLabels = Object.values(config)
		.filter((field) => field.customSettings?.displayinSiteList === "yes")
		.sort(
			(a, b) =>
				Number(a.customSettings?.displayinSiteListOrder) -
				Number(b.customSettings?.displayinSiteListOrder),
		)
		.map((field) => field.DisplayName);
	for (const table of screen.getAllByRole("table")) {
		const headers = within(table).getAllByRole("columnheader");
		const labels = headers.map((head) => head.textContent);
		expect(labels).toEqual([
			"",
			"Projekts",
			...sharedLabels.slice(0, -2),
			"Statuss",
			"Darbība",
			"Avots",
			"Rīcība",
			"Confidence",
		]);
		for (const className of fimaDiaryTableClassName.split(" "))
			expect(table).toHaveClass(className);
		const columns = [...table.querySelectorAll("col")];
		expect(
			columns.reduce(
				(total, col) => total + Number.parseFloat(col.style.width),
				0,
			),
		).toBeCloseTo(100);
		const materialWidth = Number.parseFloat(
			columns[labels.indexOf("Materiāli")].style.width,
		);
		const workWidth = Number.parseFloat(
			columns[labels.indexOf("Darba apraksts")].style.width,
		);
		expect(materialWidth / workWidth).toBeCloseTo(
			fimaDiaryColumnWeights.FimaMaterials / fimaDiaryColumnWeights.Works,
		);
		expect(headers.at(-2)).toHaveTextContent("Rīcība");
		expect(headers.at(-1)).toHaveTextContent("Confidence");
		expect(within(table).getAllByRole("row")[1].children).toHaveLength(
			headers.length,
		);
		for (const removed of [
			"Importa pārbaude",
			"BIS atsauces",
			"Avots / piezīmes",
			"Strādnieki",
			"Cilvēkstundas",
			"BIS",
			"BIS lietas Nr.",
		])
			expect(
				within(table).queryByRole("columnheader", { name: removed }),
			).not.toBeInTheDocument();
	}
	expect(screen.queryByText("123")).not.toBeInTheDocument();
});

it("groups records by work date in newest-first order and keeps project links", () => {
	render(<FimaAllProjectsDiary records={records} />);
	const headings = screen.getAllByRole("heading", { level: 2 });
	expect(headings[0]).toHaveTextContent("2. septembris");
	expect(headings[1]).toHaveTextContent("1. septembris");
	expect(
		within(tableFor("KUCE one")).getByRole("link", { name: "Olaine" }),
	).toHaveAttribute("href", "/dashboard/sites/site-1/dashboard");
});

it("selects a day without opening a record, and keyboard activation opens the panel", () => {
	render(<FimaAllProjectsDiary records={records} />);
	const table = tableFor("KUCE one");
	const boxes = within(table).getAllByRole("checkbox");
	fireEvent.click(boxes[0]);
	expect(boxes[1]).toBeChecked();
	expect(screen.getByText("Atlasīti: 1")).toBeInTheDocument();
	expect(screen.queryByLabelText("Record panel")).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Notīrīt atlasi" }));
	expect(boxes[1]).not.toBeChecked();
	fireEvent.keyDown(within(table).getAllByRole("row")[1], { key: "Enter" });
	expect(screen.getByLabelText("Record panel")).toHaveTextContent(
		"site-1 row-1",
	);
});

it("omits the optional BIS control column when no displayed project is connected", () => {
	render(<FimaAllProjectsDiary records={[records[1]]} />);
	expect(
		screen.queryByRole("columnheader", { name: "Statuss", exact: true }),
	).not.toBeInTheDocument();
	const table = screen.getByRole("table");
	expect(within(table).getAllByRole("row")[1].children).toHaveLength(
		within(table).getAllByRole("columnheader").length,
	);
});

it("shows a clear empty state", () => {
	render(<FimaAllProjectsDiary records={[]} />);
	expect(
		screen.getByText("Atbilstoši ieraksti nav atrasti."),
	).toBeInTheDocument();
	expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

it("preserves the selected record panel and checkboxes across page changes", () => {
	const { rerender } = render(<FimaAllProjectsDiary records={[records[0]]} />);
	fireEvent.click(within(tableFor("KUCE one")).getAllByRole("checkbox")[1]);
	fireEvent.keyDown(within(tableFor("KUCE one")).getAllByRole("row")[1], {
		key: "Enter",
	});
	rerender(<FimaAllProjectsDiary records={[records[1]]} />);
	expect(screen.getByLabelText("Record panel")).toHaveTextContent(
		"site-1 row-1",
	);
	expect(screen.getByText("Atlasīti: 1")).toBeInTheDocument();
	rerender(<FimaAllProjectsDiary records={[records[0]]} />);
	expect(
		within(tableFor("KUCE one")).getAllByRole("checkbox")[1],
	).toBeChecked();
});
