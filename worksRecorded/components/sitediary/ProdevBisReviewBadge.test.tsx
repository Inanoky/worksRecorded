import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { defaultProdevBisReview } from "@/lib/site-diary/prodev-bis-review";
import { saveProdevBisReview } from "@/server/actions/prodev-bis-review";
import { ProdevBisReviewBadge } from "./ProdevBisReviewBadge";

jest.mock("@/server/actions/prodev-bis-review", () => ({
	getProdevBisReview: jest.fn(),
	saveProdevBisReview: jest.fn(),
}));
jest.mock("@/server/actions/fima-diary-collaboration", () => ({
	getFimaDiaryCollaboration: jest.fn(),
}));

it("offers only two choices, defaults to Nesūtīt, and shows the saved history", async () => {
	const saved = {
		version: 1,
		status: "send_to_bis" as const,
		history: [
			{
				id: "51d11e4d-f40a-4c88-a2de-2d8466a0d8d8",
				actorId: "reviewer",
				actorName: "Testa lietotājs",
				at: "2026-11-26T10:00:00.000Z",
				from: "do_not_send" as const,
				to: "send_to_bis" as const,
			},
		],
	};
	jest.mocked(saveProdevBisReview).mockResolvedValue(saved);
	function Review() {
		const [state, setState] = useState(defaultProdevBisReview);
		return (
			<ProdevBisReviewBadge
				siteId="site"
				recordId="record"
				state={state}
				onChange={(_id, next) => setState(next)}
			/>
		);
	}
	render(<Review />);
	const trigger = screen.getByRole("combobox", { name: "Nosūtīšanas atzīme" });
	expect(trigger).toHaveTextContent("Nesūtīt");
	fireEvent.keyDown(trigger, { key: "Enter" });
	expect(screen.getAllByRole("option").map((item) => item.textContent)).toEqual(
		["Nesūtīt", "Sūtīt uz BIS"],
	);
	fireEvent.click(screen.getByRole("option", { name: "Sūtīt uz BIS" }));
	await waitFor(() =>
		expect(saveProdevBisReview).toHaveBeenCalledWith(
			expect.objectContaining({
				status: "send_to_bis",
				expectedVersion: 0,
				siteId: "site",
				recordId: "record",
			}),
		),
	);
	await waitFor(() => expect(trigger).toHaveTextContent("Sūtīt uz BIS"));
	fireEvent.click(screen.getByRole("button", { name: "Atzīmju vēsture" }));
	expect(screen.getByText("Nesūtīt → Sūtīt uz BIS")).toBeVisible();
	expect(screen.getByRole("dialog")).toHaveTextContent("Testa lietotājs");
});
