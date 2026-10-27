import { fireEvent, render, screen } from "@testing-library/react";
import type { FimaRecordActCoverage } from "@/lib/fima/acceptance-acts";
import { FimaAcceptanceActsCell } from "./FimaAcceptanceActsCell";

const coverage: FimaRecordActCoverage = {
	caseId: "668714",
	checkedAt: "2026-10-27T10:00:00Z",
	acts: [
		{
			id: "7791804",
			collection: "other_acceptance_acts",
			number: "KT-668714-2026-00016",
			date: "2026-10-07",
			status: "approving",
			works: [{ id: "587", number: "32", quantity: 3 }],
		},
	],
};

it("opens the correct act separately and shows its true status without opening the row editor", () => {
	const open = jest.fn();
	render(<FimaAcceptanceActsCell coverage={coverage} hasBisRecord />);
	const link = screen.getByRole("link", { name: "KT-668714-2026-00016" });
	expect(link).toHaveAttribute("target", "_blank");
	expect(link).toHaveAttribute(
		"href",
		"https://bis.gov.lv/bisp/lv/portal/logbooks/other_acceptance_acts/7791804/edit",
	);
	expect(screen.getByText("Nodots apstiprināšanā")).toBeInTheDocument();
	expect(screen.getByText("Aktā: 3")).toBeInTheDocument();
	document.body.addEventListener("click", open);
	fireEvent.click(link);
	document.body.removeEventListener("click", open);
	expect(open).not.toHaveBeenCalled();
});

it("distinguishes no BIS link, unchecked coverage and a checked record without an act", () => {
	const { rerender } = render(<FimaAcceptanceActsCell hasBisRecord={false} />);
	expect(screen.getByText("—")).toBeInTheDocument();
	rerender(<FimaAcceptanceActsCell hasBisRecord />);
	expect(screen.getByText("Nav pārbaudīts")).toBeInTheDocument();
	rerender(
		<FimaAcceptanceActsCell
			hasBisRecord
			coverage={{ ...coverage, acts: [] }}
		/>,
	);
	expect(screen.getByText("Nav aktā")).toHaveAttribute(
		"title",
		expect.stringContaining("Pārbaudīts:"),
	);
});
