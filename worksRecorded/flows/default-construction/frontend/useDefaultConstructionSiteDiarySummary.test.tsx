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
