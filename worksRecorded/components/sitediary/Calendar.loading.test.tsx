import { act, render, screen } from "@testing-library/react";
import { getFilledDays } from "@/server/actions/site-diary-actions";
import SiteDiaryCalendar from "./Calendar";

jest.mock("@/components/joyride/TourRunner", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("@/components/sitediary/DialogWindow", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("@/server/actions/site-diary-actions", () => ({
	getFilledDays: jest.fn(),
	getConfig: jest.fn(),
	getSitediaryRecordsBySiteIdForExcel: jest.fn(),
}));
beforeEach(() => jest.resetAllMocks());
it.each([false, true])(
	"shows loading until diary data is ready (ZTC: %s)",
	async (isZtcFlow) => {
		let resolve!: (days: number[]) => void;
		jest.mocked(getFilledDays).mockImplementation(
			() =>
				new Promise((done) => {
					resolve = done;
				}),
		);
		render(<SiteDiaryCalendar siteId="site" isZtcFlow={isZtcFlow} />);
		expect(
			screen.getByRole("status", { name: "Ielādē būvdarbu žurnālu…" }),
		).toBeInTheDocument();
		await act(async () => resolve([]));
		expect(screen.queryByRole("status")).toBeNull();
	},
);
it("releases the loading screen on errors", async () => {
	jest.mocked(getFilledDays).mockRejectedValue(new Error("failed"));
	render(<SiteDiaryCalendar siteId="site" />);
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Neizdevās ielādēt",
	);
	expect(screen.queryByRole("status")).toBeNull();
});
