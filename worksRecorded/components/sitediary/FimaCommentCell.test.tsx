import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFimaCollaboration } from "@/lib/fima/diary-collaboration";
import { saveFimaDiaryCollaboration } from "@/server/actions/fima-diary-collaboration";
import { FimaCommentCell } from "./FimaCommentCell";

jest.mock("@/server/actions/fima-diary-collaboration", () => ({
	saveFimaDiaryCollaboration: jest.fn(),
}));
it("shows an empty comment cell when there is no comment", () => {
	render(
		<FimaCommentCell
			siteId="site"
			recordId="record"
			state={readFimaCollaboration(null)}
			onChange={jest.fn()}
			onOpenRecord={jest.fn()}
		/>,
	);
	expect(
		screen.getByRole("button", { name: "Komentāri" }),
	).toBeEmptyDOMElement();
	expect(screen.queryByText("Pievienot komentāru")).not.toBeInTheDocument();
});
it("shows only the latest comment and appends inline comments without rewriting history", async () => {
	const event = {
		id: "1",
		kind: "comment" as const,
		actorId: "a",
		actorName: "Anna",
		at: "2026-10-16T10:00:00Z",
		text: "Older comment",
	};
	const state = {
		...readFimaCollaboration(null),
		history: [event, { ...event, id: "2", text: "Latest comment" }],
	};
	jest.mocked(saveFimaDiaryCollaboration).mockResolvedValue(state);
	render(
		<FimaCommentCell
			siteId="site"
			recordId="record"
			state={state}
			onChange={jest.fn()}
			onOpenRecord={jest.fn()}
		/>,
	);
	expect(screen.getByText("Latest comment")).toBeInTheDocument();
	expect(screen.queryByText("Older comment")).not.toBeInTheDocument();
	fireEvent.click(
		screen.getByRole("button", { name: "Pievienot komentāru rindā" }),
	);
	fireEvent.change(screen.getByLabelText("Jauns komentārs rindā"), {
		target: { value: "Another comment" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
	await waitFor(() =>
		expect(saveFimaDiaryCollaboration).toHaveBeenCalledWith(
			expect.objectContaining({
				siteId: "site",
				recordId: "record",
				kind: "comment",
				text: "Another comment",
				requestId: expect.any(String),
			}),
		),
	);
});
