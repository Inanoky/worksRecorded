import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { loadCurrentConstructionWeekReport } from "@/server/actions/construction-planner";
import { WeeklyPdfExport } from "./WeeklyPdfExport";
import { downloadWeeklyPdf } from "./weekly-pdf";

jest.mock("@/server/actions/construction-planner", () => ({
	loadCurrentConstructionWeekReport: jest.fn(),
}));
jest.mock("./weekly-pdf", () => ({ downloadWeeklyPdf: jest.fn() }));

beforeEach(() => jest.clearAllMocks());
it("loads the complete saved current week only on click and downloads once", async () => {
	jest
		.mocked(loadCurrentConstructionWeekReport)
		.mockResolvedValue({ siteName: "Test" } as never);
	render(<WeeklyPdfExport siteId="site" organizationLanguage="lv" />);
	expect(loadCurrentConstructionWeekReport).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Nedēļas PDF" }));
	expect(
		screen.getByRole("button", { name: "Sagatavo nedēļas PDF…" }),
	).toBeDisabled();
	await waitFor(() =>
		expect(downloadWeeklyPdf).toHaveBeenCalledWith({
			siteName: "Test",
			organizationLanguage: "lv",
		}),
	);
	expect(loadCurrentConstructionWeekReport).toHaveBeenCalledWith("site");
	expect(downloadWeeklyPdf).toHaveBeenCalledTimes(1);
});

it("shows a retryable error instead of downloading an incomplete report", async () => {
	jest
		.mocked(loadCurrentConstructionWeekReport)
		.mockRejectedValue(new Error("Nav piekļuves."));
	render(<WeeklyPdfExport siteId="site" organizationLanguage="lv" />);
	fireEvent.click(screen.getByRole("button", { name: "Nedēļas PDF" }));
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Neizdevās eksportēt nedēļas PDF.",
	);
	expect(downloadWeeklyPdf).not.toHaveBeenCalled();
	expect(screen.getByRole("button", { name: "Nedēļas PDF" })).toBeEnabled();
});

it("localizes the export control and forwards English to the report", async () => {
	jest
		.mocked(loadCurrentConstructionWeekReport)
		.mockResolvedValue({ siteName: "Test" } as never);
	render(<WeeklyPdfExport siteId="site" organizationLanguage="en" />);
	const button = screen.getByRole("button", { name: "Weekly PDF" });
	expect(button).toHaveAttribute(
		"title",
		expect.stringContaining("Monday–Sunday"),
	);
	fireEvent.click(button);
	await waitFor(() =>
		expect(downloadWeeklyPdf).toHaveBeenCalledWith({
			siteName: "Test",
			organizationLanguage: "en",
		}),
	);
});

it("never leaks Latvian server errors into the English export UI", async () => {
	jest
		.mocked(loadCurrentConstructionWeekReport)
		.mockRejectedValue(new Error("Nav piekļuves."));
	render(<WeeklyPdfExport siteId="site" organizationLanguage="en" />);
	fireEvent.click(screen.getByRole("button", { name: "Weekly PDF" }));
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Could not export the weekly PDF. Please try again.",
	);
});
