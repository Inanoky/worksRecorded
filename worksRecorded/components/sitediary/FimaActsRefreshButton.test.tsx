import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { refreshFimaAcceptanceActs } from "@/server/actions/fima-acceptance-acts";
import { FimaActsRefreshButton } from "./FimaActsRefreshButton";

jest.mock("@/server/actions/fima-acceptance-acts", () => ({
	refreshFimaAcceptanceActs: jest.fn(),
}));
jest.mock("sonner", () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

it("refreshes only the selected project and reloads visible rows after success", async () => {
	jest
		.mocked(refreshFimaAcceptanceActs)
		.mockResolvedValue({ actCount: 46, checkedAt: "2026-10-27T10:00:00Z" });
	const reload = jest.fn();
	render(<FimaActsRefreshButton siteId="project" onRefreshed={reload} />);
	fireEvent.click(screen.getByRole("button", { name: "Atjaunot aktus" }));
	await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
	expect(refreshFimaAcceptanceActs).toHaveBeenCalledWith("project");
});

it("does not offer an unscoped all-projects refresh", () => {
	render(<FimaActsRefreshButton onRefreshed={jest.fn()} />);
	expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
