import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useCallback, useState } from "react";
import { PlanTableColumns } from "@/flows/default-construction/planner/DayPlan";
import {
	type FimaCollaboration,
	fimaVirtualFields,
} from "@/lib/fima/diary-collaboration";
import {
	getFimaDiaryCollaboration,
	saveFimaDiaryCollaboration,
} from "@/server/actions/fima-diary-collaboration";
import { FimaDiaryCell } from "./FimaDiaryCell";

jest.mock("@/server/actions/fima-diary-collaboration", () => ({
	getFimaAvailableMaterials: jest.fn(),
	getFimaDiaryCollaboration: jest.fn(),
	saveFimaDiaryCollaboration: jest.fn(),
	refreshFimaBisMaterials: jest.fn(),
}));
jest.mock("@/server/actions/fima-warehouse", () => ({
	getFimaWarehouseAvailability: jest.fn(),
}));
const initial: FimaCollaboration = {
	version: 0,
	status: null,
	materials: [],
	history: [],
};
const siteId = "c39cb04c-8ce5-477d-acd0-99586a82d850";
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getFimaDiaryCollaboration).mockResolvedValue(initial);
});
function Harness() {
	const [state, setState] = useState(initial);
	const change = useCallback(
		(_id: string, value: FimaCollaboration) => setState(value),
		[],
	);
	return (
		<FimaDiaryCell
			field="FimaComments"
			siteId={siteId}
			row={{ id: "record", fimaCollaboration: state }}
			onChange={change}
		/>
	);
}
it("opens shared history, saves a comment and displays its authenticated author", async () => {
	jest.mocked(saveFimaDiaryCollaboration).mockResolvedValue({
		...initial,
		version: 1,
		history: [
			{
				id: "event",
				kind: "comment",
				actorId: "member",
				actorName: "Anna Bērziņa",
				at: "2026-10-15T10:00:00Z",
				text: "Pārbaudīt stiprinājumu",
			},
		],
	});
	render(<Harness />);
	fireEvent.click(screen.getByRole("button", { name: /Komentāri/ }));
	const input = await screen.findByLabelText("Jauns komentārs");
	fireEvent.change(input, { target: { value: "Pārbaudīt stiprinājumu" } });
	fireEvent.click(screen.getByRole("button", { name: "Pievienot komentāru" }));
	await waitFor(() =>
		expect(saveFimaDiaryCollaboration).toHaveBeenCalledWith(
			expect.objectContaining({
				siteId,
				recordId: "record",
				kind: "comment",
				text: "Pārbaudīt stiprinājumu",
			}),
		),
	);
	expect(await screen.findByText(/Anna Bērziņa ·/)).toBeInTheDocument();
});
it("shows cached BIS materials without issuing an API call for each table row", () => {
	render(
		<FimaDiaryCell
			field="FimaMaterials"
			siteId={siteId}
			row={{
				id: "record",
				fimaCollaboration: {
					...initial,
					bisMaterials: {
						fetchedAt: "2026-10-15T10:00:00Z",
						entries: [
							{
								bisId: "123",
								caseId: "456",
								materials: [
									{
										id: "m",
										label: "BFA-0000-ANC-0017",
										unit: "gab.",
										quantity: 2,
									},
								],
							},
						],
					},
				},
			}}
			onChange={jest.fn()}
		/>,
	);
	expect(screen.getByText(/BFA-0000-ANC-0017/)).toBeInTheDocument();
	expect(getFimaDiaryCollaboration).not.toHaveBeenCalled();
});
it.each([false, true])(
	"fits FIMA columns with BIS connected=%s",
	(bisEnabled) => {
		const fields = [
			"Date",
			"Works",
			"Works_Custom_1",
			"Location",
			...fimaVirtualFields,
			"Comments",
			"Amounts",
			"Units",
		];
		const { container } = render(
			<table>
				<PlanTableColumns
					fields={fields}
					bisEnabled={bisEnabled}
					showPlan={false}
				/>
			</table>,
		);
		const columns = [...container.querySelectorAll("col")];
		expect(columns).toHaveLength(fields.length + 3 + (bisEnabled ? 2 : 0));
		expect(
			columns.reduce((sum, col) => sum + Number.parseFloat(col.style.width), 0),
		).toBeCloseTo(100);
	},
);

it.each([undefined, { fetchedAt: "2026-10-16T10:00:00Z", entries: [] }])(
	"leaves materials empty when no materials are associated",
	(snapshot) => {
		const { container } = render(
			<FimaDiaryCell
				field="FimaMaterials"
				siteId={siteId}
				row={{
					id: "record",
					fimaCollaboration: { ...initial, bisMaterials: snapshot },
				}}
				onChange={jest.fn()}
			/>,
		);
		expect(container.textContent).toBe("");
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Pievienot materiālus" }),
		).toBeEnabled();
		expect(getFimaDiaryCollaboration).not.toHaveBeenCalled();
	},
);
it("keeps material management accessible in the record panel even with no materials", () => {
	render(
		<FimaDiaryCell
			materialEditor
			field="FimaMaterials"
			siteId={siteId}
			row={{ id: "record" }}
			onChange={jest.fn()}
		/>,
	);
	expect(
		screen.getByRole("button", { name: "Pārvaldīt materiālus" }),
	).toBeInTheDocument();
});

it("shows associated BIS materials alongside prepared materials without duplicating the same material", () => {
	const shared = {
		id: "one",
		label: "Prepared insulator",
		quantity: 2,
		unit: "gab.",
	};
	render(
		<FimaDiaryCell
			field="FimaMaterials"
			siteId={siteId}
			row={{
				id: "record",
				fimaCollaboration: {
					...initial,
					materials: [shared],
					bisMaterials: {
						fetchedAt: "2026-10-16T10:00:00Z",
						entries: [
							{
								caseId: "456",
								bisId: "123",
								materials: [
									shared,
									{
										id: "two",
										label: "BIS bracket",
										quantity: 1,
										unit: "gab.",
									},
								],
							},
						],
					},
				},
			}}
			onChange={jest.fn()}
		/>,
	);
	expect(screen.getAllByText(/Prepared insulator/)).toHaveLength(1);
	expect(screen.getByText(/BIS bracket/)).toBeInTheDocument();
});

it("shows only the BIS record number and links to that record instead of the case", () => {
	render(
		<FimaDiaryCell
			field="FimaBisCase"
			siteId={siteId}
			caseId="668714"
			caseNumber="BIS-BL-668714"
			row={{
				id: "record",
				BISId: "7787127",
				fimaBisRecords: [{ id: "7787127", number: "653" }],
			}}
			onChange={jest.fn()}
		/>,
	);
	const link = screen.getByRole("link", { name: "653" });
	expect(link).toHaveAttribute(
		"href",
		"https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/7787127/edit?entry_ids%5B%5D=7787127",
	);
	expect(link).toHaveAttribute("target", "_blank");
	expect(screen.queryByText("BIS-BL-668714")).not.toBeInTheDocument();
	expect(screen.queryByText("7787127")).not.toBeInTheDocument();
});
it("leaves an unlinked BIS record cell blank instead of showing the project case", () => {
	render(
		<FimaDiaryCell
			field="FimaBisCase"
			siteId={siteId}
			caseId="668714"
			caseNumber="BIS-BL-668714"
			row={{ id: "record" }}
			onChange={jest.fn()}
		/>,
	);
	expect(screen.queryByRole("link")).not.toBeInTheDocument();
	expect(screen.queryByText("BIS-BL-668714")).not.toBeInTheDocument();
});

it("renders each BIS example as its own clickable bullet without opening the row", () => {
	const openRow = jest.fn();
	const examples = {
		entries: [
			{
				id: "7540711",
				label: "BIS ieraksts Nr.360 (Olaine stacija, lieta BIS-BL-668714-524)",
				url: "https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/7540711",
			},
			{
				id: "7209025",
				label:
					"BIS ieraksts Nr.1806 (Torņakalns–Olaine, lieta BIS-BL-668708-558)",
				url: "https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/7209025",
			},
		],
		note: "Nav tieša parauga. Salīdzināšanai izmantots:",
	};
	render(
		<table>
			<tbody>
				<tr tabIndex={0} onClick={openRow} onKeyDown={openRow}>
					<td>
						<FimaDiaryCell
							field="FimaExamples"
							siteId={siteId}
							row={{
								id: "record",
								fimaCollaboration: { ...initial, examples },
							}}
							onChange={jest.fn()}
						/>
					</td>
				</tr>
			</tbody>
		</table>,
	);
	expect(screen.getAllByRole("listitem")).toHaveLength(2);
	const links = screen.getAllByRole("link");
	for (const [index, link] of links.entries()) {
		expect(link).toHaveAttribute("href", examples.entries[index].url);
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
	}
	fireEvent.click(links[0]);
	expect(openRow).not.toHaveBeenCalled();
	expect(screen.getByText(examples.note)).toBeInTheDocument();
	expect(getFimaDiaryCollaboration).not.toHaveBeenCalled();
});
