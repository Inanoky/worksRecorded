import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type {
	FimaCollaboration,
	FimaEvent,
} from "@/lib/fima/diary-collaboration";
import { getFimaDiaryCollaboration } from "@/server/actions/fima-diary-collaboration";
import { FimaReviewBadge } from "./FimaReviewBadge";

jest.mock("@/server/actions/fima-diary-collaboration", () => ({
	getFimaDiaryCollaboration: jest.fn(),
	saveFimaDiaryCollaboration: jest.fn(),
}));
const initial: FimaCollaboration = {
	version: 0,
	status: null,
	history: [],
	materials: [],
};
const first: FimaEvent = {
	id: "first",
	kind: "status",
	actorId: "anna",
	actorName: "Anna Bērziņa",
	at: "2026-10-19T08:00:00Z",
	text: "Rīcība: Labot",
	previousStatus: null,
	status: "needs_changes",
};
const removed: FimaEvent = {
	id: "removed",
	kind: "status",
	actorId: "janis",
	actorName: "Jānis Ozols",
	at: "2026-10-19T09:00:00Z",
	text: "Rīcība: Nav atzīmes",
	previousStatus: "needs_changes",
	status: null,
};
const full: FimaCollaboration = {
	...initial,
	version: 3,
	history: [
		first,
		{ ...first, id: "comment", kind: "comment", text: "Comment only" },
		removed,
	],
};
const onChange = jest.fn();
beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(getFimaDiaryCollaboration).mockResolvedValue(full);
});
function mount(state = initial) {
	return render(
		<FimaReviewBadge
			siteId="site"
			recordId="record"
			state={state}
			onChange={onChange}
		/>,
	);
}

it("shows the last badge author in the row and loads full badge history only when opened", async () => {
	mount({ ...full, history: [removed] });
	expect(screen.getByText("Jānis Ozols")).toBeInTheDocument();
	expect(getFimaDiaryCollaboration).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Atzīmju vēsture" }));
	const dialog = screen.getByRole("dialog", { name: "Atzīmju vēsture" });
	expect(await within(dialog).findByText("Anna Bērziņa")).toBeInTheDocument();
	const changes = within(dialog).getAllByRole("listitem");
	expect(changes).toHaveLength(2);
	expect(changes[0]).toHaveTextContent("Jānis Ozols");
	expect(changes[0]).toHaveTextContent("Labot → Nav atzīmes");
	expect(changes[0].querySelector("time")).toHaveAttribute(
		"datetime",
		removed.at,
	);
	expect(changes[1]).toHaveTextContent("Nav atzīmes → Labot");
	expect(within(dialog).queryByText("Comment only")).not.toBeInTheDocument();
	expect(onChange).toHaveBeenCalledWith("record", full);
});

it("displays saved legacy badge events without inventing their previous badge", async () => {
	jest.mocked(getFimaDiaryCollaboration).mockResolvedValue({
		...full,
		history: [{ ...first, previousStatus: undefined, status: undefined }],
	});
	mount();
	fireEvent.click(screen.getByRole("button", { name: "Atzīmju vēsture" }));
	expect(await screen.findByText("Rīcība: Labot")).toBeInTheDocument();
});

it("shows a failure and supports retry instead of claiming the history is empty", async () => {
	jest
		.mocked(getFimaDiaryCollaboration)
		.mockRejectedValueOnce(new Error("Offline"));
	mount();
	fireEvent.click(screen.getByRole("button", { name: "Atzīmju vēsture" }));
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Neizdevās ielādēt",
	);
	expect(
		screen.queryByText("Atzīmju izmaiņu vēl nav."),
	).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Mēģināt vēlreiz" }));
	expect(await screen.findByText("Anna Bērziņa")).toBeInTheDocument();
});

it("ignores an old response after the history closes", async () => {
	let finish!: (value: FimaCollaboration) => void;
	jest.mocked(getFimaDiaryCollaboration).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	mount();
	fireEvent.click(screen.getByRole("button", { name: "Atzīmju vēsture" }));
	await waitFor(() =>
		expect(getFimaDiaryCollaboration).toHaveBeenCalledTimes(1),
	);
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
	await act(async () => finish(full));
	expect(onChange).not.toHaveBeenCalled();
});
