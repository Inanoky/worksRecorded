import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { getDefaultConstructionScopeSummary } from "../backend/site-diary-summary-actions";
import { useDefaultConstructionSiteDiarySummary } from "./useDefaultConstructionSiteDiarySummary";

jest.mock("../backend/site-diary-summary-actions", () => ({
	getDefaultConstructionScopeSummary: jest.fn(),
}));
const data = {
	rows: [
		{
			Works: "Floor",
			Location: "A",
			Amounts: "10",
			Units: "m2",
			WorkersInvolved: "2",
			TimeInvolved: "8",
		},
	],
	config: {},
};
function Summary() {
	const [location, setLocation] = useState("__ALL__"),
		[work, setWork] = useState("__ALL__");
	const summary = useDefaultConstructionSiteDiarySummary({
		enabled: true,
		siteId: "site",
		organizationLanguage: "en",
		locationFilter: location,
		workFilter: work,
		setLocationFilter: setLocation,
		setWorkFilter: setWork,
		setViewMode: () => {},
		clientData: data,
	});
	return (
		<>
			{summary.panel}
			<output aria-label="Work filter">{work}</output>
			<output aria-label="Location filter">{location}</output>
			<button type="button" onClick={() => summary.openWorkSummary("Floor")}>
				Work summary
			</button>
			<button type="button" onClick={() => setLocation("B")}>
				Filter another location
			</button>
			<button type="button" onClick={() => summary.openLocationSummary("A")}>
				Location summary
			</button>
		</>
	);
}
it("opens cached project and location summaries without a server request", async () => {
	render(<Summary />);
	fireEvent.click(screen.getByRole("button", { name: "Show project summary" }));
	expect(await screen.findByText(/Project: Whole project/)).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Location summary" }));
	expect(await screen.findByText("Location: A")).toBeInTheDocument();
	expect(getDefaultConstructionScopeSummary).not.toHaveBeenCalled();
});

it("clears the selected work filter when its summary is closed and preserves other filters", async () => {
	render(<Summary />);
	fireEvent.click(screen.getByRole("button", { name: "Work summary" }));
	expect(await screen.findByText("Work: Floor")).toBeInTheDocument();
	expect(screen.getByLabelText("Work filter")).toHaveTextContent("Floor");
	fireEvent.click(
		screen.getByRole("button", { name: "Filter another location" }),
	);
	fireEvent.click(screen.getByRole("button", { name: "Close summary" }));
	expect(screen.queryByText("Work: Floor")).not.toBeInTheDocument();
	expect(screen.getByLabelText("Work filter")).toHaveTextContent("__ALL__");
	expect(screen.getByLabelText("Location filter")).toHaveTextContent("B");
});

it("clears the location filter when its summary is closed", async () => {
	render(<Summary />);
	fireEvent.click(screen.getByRole("button", { name: "Location summary" }));
	expect(await screen.findByText("Location: A")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Close summary" }));
	expect(screen.getByLabelText("Location filter")).toHaveTextContent("__ALL__");
	expect(screen.queryByText("Location: A")).not.toBeInTheDocument();
});
