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
