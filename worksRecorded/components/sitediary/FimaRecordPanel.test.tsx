import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useCallback, useState } from "react";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import {
	getFimaDiaryCollaboration,
	saveFimaDiaryCollaboration,
} from "@/server/actions/fima-diary-collaboration";
import { FimaDiaryCell } from "./FimaDiaryCell";
import { FimaRecordPanel } from "./FimaRecordPanel";

jest.mock("@/server/actions/fima-diary-collaboration", () => ({
	getFimaDiaryCollaboration: jest.fn(),
	saveFimaDiaryCollaboration: jest.fn(),
	getFimaAvailableMaterials: jest.fn(),
	refreshFimaBisMaterials: jest.fn(),
}));
const initial: FimaCollaboration = {
	version: 0,
	status: null,
	materials: [],
	history: [],
};
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getFimaDiaryCollaboration).mockResolvedValue(initial);
});
function Harness() {
	const [selected, setSelected] = useState("record-1");
	const [states, setStates] = useState<Record<string, FimaCollaboration>>({});
	const onChange = useCallback(
		(id: string, state: FimaCollaboration) =>
			setStates((all) => ({ ...all, [id]: state })),
		[],
	);
	return (
		<>
			<button
				type="button"
				onClick={() =>
					setSelected(selected === "record-1" ? "record-2" : "record-1")
				}
			>
				Mainīt ierakstu
			</button>
			<FimaRecordPanel
				siteId="site"
				row={
					selected
						? {
								id: selected,
								Works:
									selected === "record-1" ? "Konsoles montāža" : "CW demontāža",
								Date: "2026-09-01",
								Location: "21-9",
								fimaCollaboration: states[selected],
							}
						: null
				}
				caseId="668714"
				caseNumber="BIS-BL-668714-524"
				onClose={() => setSelected("")}
				onChange={onChange}
			/>
		</>
	);
}
it("opens as a right-hand panel, exposes BIS links and saves shared comments with history", async () => {
	jest.mocked(saveFimaDiaryCollaboration).mockResolvedValue({
		...initial,
		version: 1,
		history: [
			{
				id: "event",
				kind: "comment",
				actorId: "member",
				actorName: "Anna Bērziņa",
				at: "2026-10-16T08:00:00Z",
				text: "Balsti pārbaudīti",
			},
		],
	});
	render(<Harness />);
	const panel = screen.getByRole("dialog", { name: "Ieraksta pārskats" });
	expect(panel).toHaveClass("right-0", "h-dvh");
	expect(panel).not.toHaveAttribute("aria-modal", "true");
	expect(
		screen.getByRole("link", { name: "BIS-BL-668714-524" }),
	).toHaveAttribute(
		"href",
		"https://bis.gov.lv/bisp/lv/portal/bis_cases/668714/logbook/logbooks",
	);
	fireEvent.change(screen.getByLabelText("Jauns komentārs"), {
		target: { value: "Balsti pārbaudīti" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Pievienot komentāru" }));
	expect(await screen.findByText("Balsti pārbaudīti")).toBeInTheDocument();
	expect(await screen.findByText(/Anna Bērziņa ·/)).toBeInTheDocument();
	expect(saveFimaDiaryCollaboration).toHaveBeenCalledWith(
		expect.objectContaining({ recordId: "record-1", kind: "comment" }),
	);
});
it("allows switching records from the list and retains each unsent comment draft", async () => {
	render(<Harness />);
	fireEvent.change(screen.getByLabelText("Jauns komentārs"), {
		target: { value: "Nenosūtīts komentārs" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Mainīt ierakstu" }));
	expect(
		screen.getByRole("heading", { name: "CW demontāža" }),
	).toBeInTheDocument();
	expect(screen.getByLabelText("Jauns komentārs")).toHaveValue("");
	fireEvent.click(screen.getByRole("button", { name: "Mainīt ierakstu" }));
	expect(screen.getByLabelText("Jauns komentārs")).toHaveValue(
		"Nenosūtīts komentārs",
	);
	fireEvent.click(
		screen.getByRole("button", { name: "Aizvērt ieraksta paneli" }),
	);
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
});
it("makes the table case number a new-tab BIS link without opening the record panel", () => {
	const onOpen = jest.fn();
	render(
		<FimaDiaryCell
			field="FimaBisCase"
			siteId="site"
			row={{ id: "record" }}
			caseId="668714"
			caseNumber="BIS-BL-668714-524"
			onOpenRecord={onOpen}
			onChange={jest.fn()}
		/>,
	);
	const link = screen.getByRole("link", { name: "BIS-BL-668714-524" });
	expect(link).toHaveAttribute("target", "_blank");
	fireEvent.click(link);
	expect(onOpen).not.toHaveBeenCalled();
});
