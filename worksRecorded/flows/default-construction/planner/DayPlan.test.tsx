import { render, screen, within } from "@testing-library/react";
import {
	PlanColumnCell,
	PlanColumnHead,
	PlanOnlyRow,
	PlanTableColumns,
} from "./DayPlan";
import { comparePlans } from "./model";

const row = comparePlans(
	[
		{
			id: "plan",
			date: "2026-09-17",
			work: "Balkonu montāža",
			location: "3. stāvs",
			unit: "m2",
			quantity: 35,
			version: 1,
		},
	],
	[],
	"2026-09-16",
)[0];
const fields = [
	"createdAt",
	"Location",
	"Works",
	"Units",
	"Amounts",
	"WorkersInvolved",
	"TimeInvolved",
	"Comments",
];

describe("plan table alignment", () => {
	it.each([false, true])(
		"fits diary columns into 100%% width with showPlan=%s",
		(showPlan) => {
			const diaryFields = [...fields, "Comments_Custom_1", "Photos"];
			const { container } = render(
				<table>
					<PlanTableColumns
						fields={diaryFields}
						bisEnabled={false}
						showPlan={showPlan}
					/>
				</table>,
			);
			const columns = Array.from(container.querySelectorAll("col"));
			expect(columns).toHaveLength(diaryFields.length + 5 + (showPlan ? 2 : 0));
			expect(
				columns.reduce(
					(sum, column) => sum + Number.parseFloat(column.style.width),
					0,
				),
			).toBeCloseTo(100);
			for (const column of columns) expect(column.style.width).toMatch(/%$/);
		},
	);

	it("keeps planned columns enabled by default and includes BIS columns", () => {
		const { container } = render(
			<table>
				<PlanTableColumns fields={fields} bisEnabled />
			</table>,
		);
		expect(container.querySelectorAll("col")).toHaveLength(17);
	});
	it("fits configured KUCE and BIS work columns alongside every diary control", () => {
		const diaryFields = [
			"Date",
			"Works",
			"Works_Custom_1",
			"Location",
			"Works_Custom_2",
			"WorkersInvolved",
			"TimeInvolved",
			"Comments_Custom_1",
			"Comments_Custom_2",
			"Comments",
			"Amounts",
			"Units",
		];
		const { container } = render(
			<table>
				<PlanTableColumns
					fields={diaryFields}
					bisEnabled
					showPlan={false}
					columnWeights={{
						Works: 200,
						Works_Custom_1: 300,
						Location: 130,
						select: 36,
						bis: 100,
						status: 110,
						action: 60,
						source: 40,
						"man-hours": 65,
						cost: 80,
					}}
				/>
			</table>,
		);
		const columns = Array.from(container.querySelectorAll("col"));
		expect(columns).toHaveLength(diaryFields.length + 7);
		expect(
			columns.reduce(
				(sum, column) => sum + Number.parseFloat(column.style.width),
				0,
			),
		).toBeCloseTo(100);
		expect(
			Number.parseFloat(columns[3].style.width) /
				Number.parseFloat(columns[2].style.width),
		).toBeCloseTo(1.5);
		for (const column of columns)
			expect(Number.parseFloat(column.style.width)).toBeGreaterThan(0);
	});
	it("ignores invalid configured widths without hiding a column", () => {
		const { container } = render(
			<table>
				<PlanTableColumns
					fields={["Works", "Works_Custom_1"]}
					bisEnabled={false}
					showPlan={false}
					columnWeights={{ Works: Infinity, Works_Custom_1: 0, select: -1 }}
				/>
			</table>,
		);
		const columns = Array.from(container.querySelectorAll("col"));
		expect(columns).toHaveLength(5);
		expect(
			columns.reduce(
				(sum, column) => sum + Number.parseFloat(column.style.width),
				0,
			),
		).toBeCloseTo(100);
		for (const column of columns)
			expect(Number.parseFloat(column.style.width)).toBeGreaterThan(0);
	});

	it("aligns every placeholder to the same column and top padding as actual rows", () => {
		render(
			<table>
				<tbody>
					<PlanOnlyRow row={row} fields={fields} bisEnabled />
				</tbody>
			</table>,
		);
		const cells = within(screen.getByRole("row")).getAllByRole("cell");
		expect(cells).toHaveLength(17);
		for (const cell of cells)
			expect(cell).toHaveClass("align-top", "py-3", "px-3");
		const centered = [0, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16];
		for (const index of centered)
			expect(cells[index]).toHaveClass("text-center");
		expect(cells[11]).toHaveClass("text-right");
		for (const index of [1, 2, 3, 4, 12])
			expect(cells[index]).toHaveClass("text-left");
	});

	it("respects custom field alignment for both planned and actual columns", () => {
		render(
			<table>
				<tbody>
					<PlanOnlyRow
						row={row}
						fields={["Works", "Amounts"]}
						bisEnabled={false}
						getAlignment={() => "right"}
					/>
				</tbody>
			</table>,
		);
		const cells = within(screen.getByRole("row")).getAllByRole("cell");
		for (const index of [1, 2, 3, 4])
			expect(cells[index]).toHaveClass("text-right");
	});

	it("uses matching alignment for planned quantity headers and values", () => {
		render(
			<table>
				<thead>
					<tr>
						<PlanColumnHead field="Amounts" align="center" />
					</tr>
				</thead>
				<tbody>
					<tr>
						<PlanColumnCell field="Amounts" row={row} align="center" />
					</tr>
				</tbody>
			</table>,
		);
		expect(screen.getByRole("columnheader")).toHaveClass(
			"text-center",
			"align-middle",
		);
		expect(screen.getByRole("cell")).toHaveClass(
			"text-center",
			"align-top",
			"py-3",
		);
	});
});

it.each([false, true])(
	"keeps the FIMA review badge in the final column with BIS enabled=%s",
	(bisEnabled) => {
		const trailingFields = ["FimaReviewStatus"];
		const { container } = render(
			<table>
				<PlanTableColumns
					fields={fields}
					bisEnabled={bisEnabled}
					trailingFields={trailingFields}
				/>
				<tbody>
					<PlanOnlyRow
						row={row}
						fields={fields}
						bisEnabled={bisEnabled}
						trailingFields={trailingFields}
					/>
				</tbody>
			</table>,
		);
		const columns = [...container.querySelectorAll("col")];
		const cells = [...container.querySelectorAll("tbody tr td")];
		expect(columns.length).toBe(cells.length);
		expect(cells.at(-1)).toHaveTextContent("—");
		expect(
			columns.reduce((sum, col) => sum + Number.parseFloat(col.style.width), 0),
		).toBeCloseTo(100);
	},
);

it("removes the separate BIS status column in FIMA while keeping table and plan placeholders aligned", () => {
	const { container } = render(
		<table>
			<PlanTableColumns
				fields={fields}
				bisEnabled
				hideBisStatus
				trailingFields={["FimaReviewStatus"]}
			/>
			<tbody>
				<PlanOnlyRow
					row={row}
					fields={fields}
					bisEnabled
					hideBisStatus
					trailingFields={["FimaReviewStatus"]}
				/>
			</tbody>
		</table>,
	);
	const cols = [...container.querySelectorAll("col")];
	expect(cols.length).toBe(container.querySelectorAll("td").length);
	expect(
		cols.reduce((sum, col) => sum + Number.parseFloat(col.style.width), 0),
	).toBeCloseTo(100);
	expect(cols).toHaveLength(17);
});
