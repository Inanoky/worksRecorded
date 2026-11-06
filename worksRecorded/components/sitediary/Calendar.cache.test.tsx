import { fireEvent, render, screen } from "@testing-library/react";
import { getFilledDays } from "@/server/actions/site-diary-actions";
import SiteDiaryCalendar from "./Calendar";

const today = new Date();
const date = new Date(today.getFullYear(), today.getMonth(), 6);
const snapshot = {
	version: "v1",
	config: {},
	diary: {
		rows: [{ id: "one", Date: date, Works: "Original" }],
		mediaPhotos: [],
	},
};
let mockSnapshot = snapshot;
jest.mock("@/flows/default-construction/frontend/LimeniProjectData", () => ({
	useLimeniProjectData: () => ({ enabled: true, snapshot: mockSnapshot }),
}));
jest.mock("@/flows/default-construction/frontend/DiarySaveProvider", () => ({
	useDiarySaveQueue: () => ({ snapshot: { items: [], revision: 0 } }),
}));
jest.mock("@/components/joyride/TourRunner", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("@/flows/default-construction/frontend/DiaryFeedbackBrain", () => ({
	DiaryFeedbackBrain: () => null,
}));
jest.mock("@/server/actions/site-diary-actions", () => ({
	getFilledDays: jest.fn(),
	getConfig: jest.fn(),
	getSitediaryRecordsBySiteIdForExcel: jest.fn(),
}));
jest.mock("./DialogWindow", () => {
	const React = jest.requireActual<typeof import("react")>("react");
	return {
		__esModule: true,
		default: ({
			open,
			initialRows,
		}: {
			open: boolean;
			initialRows?: { Works: string }[];
		}) => {
			const [draft, setDraft] = React.useState("");
			React.useEffect(() => {
				setDraft(initialRows?.[0]?.Works ?? "");
			}, [initialRows]);
			return open ? (
				<input
					aria-label="Day draft"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
				/>
			) : null;
		},
	};
});
beforeEach(() => {
	mockSnapshot = snapshot;
	jest.clearAllMocks();
});
it("changes cached months without requesting filled days", () => {
	render(<SiteDiaryCalendar siteId="site" />);
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: ">" }));
	fireEvent.click(screen.getByRole("button", { name: "<" }));
	expect(getFilledDays).not.toHaveBeenCalled();
});
it("preserves an open day draft when a newer cached snapshot arrives", () => {
	const view = render(<SiteDiaryCalendar siteId="site" />);
	const day = view.container.querySelector(
		'[data-tour="first-completed-diary-record"]',
	);
	if (!day) throw new Error("Missing filled day");
	fireEvent.click(day);
	fireEvent.change(screen.getByLabelText("Day draft"), {
		target: { value: "Unsaved" },
	});
	mockSnapshot = {
		...snapshot,
		version: "v2",
		diary: {
			...snapshot.diary,
			rows: [{ ...snapshot.diary.rows[0], Works: "Updated" }],
		},
	};
	view.rerender(<SiteDiaryCalendar siteId="site" />);
	expect(screen.getByLabelText("Day draft")).toHaveValue("Unsaved");
	expect(getFilledDays).not.toHaveBeenCalled();
});
