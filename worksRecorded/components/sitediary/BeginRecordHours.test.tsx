import { act, fireEvent, render, screen } from "@testing-library/react";
import { BEGIN_STORAGE_MARKER, type BeginDay } from "@/lib/begin-hours";
import { BeginRecordHours } from "./BeginRecordHours";

const explanation = "Stundu uzskaite 28.09.2026.: 761 / 60 / 2 = 6,3416667 h.";
const day: BeginDay = {
	kind: BEGIN_STORAGE_MARKER,
	version: 1,
	date: "2026-09-25",
	importedAt: "2026-09-28T07:00:00Z",
	importedBy: "test",
	sourceCompany: "Test",
	capturedOn: "2026-09-28",
	rateCents: 1250,
	objects: ["Site"],
	entries: [],
	history: [],
	allocations: [
		{
			recordId: "record",
			explanation,
			hours: 761 / 60 / 2,
			workers: 2,
			source: "legacy-comment",
			savedAt: "2026-09-28T08:00:00Z",
			sourceImportedAt: "2026-09-28T07:00:00Z",
		},
	],
};

it("opens the full explanation on hover and keeps it open while entering the card", () => {
	jest.useFakeTimers();
	try {
		render(
			<BeginRecordHours
				day={day}
				recordId="record"
				value="6,34"
				hours={761 / 60 / 2}
				workers={2}
			/>,
		);
		expect(screen.queryByText(explanation)).not.toBeInTheDocument();
		const trigger = screen.getByRole("button");
		fireEvent.pointerEnter(trigger);
		expect(screen.getByText(explanation)).toBeInTheDocument();
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
		fireEvent.pointerLeave(trigger);
		fireEvent.pointerEnter(screen.getByRole("dialog"));
		act(() => jest.advanceTimersByTime(250));
		expect(screen.getByText(explanation)).toBeInTheDocument();
		fireEvent.pointerLeave(screen.getByRole("dialog"));
		act(() => jest.advanceTimersByTime(250));
		expect(screen.queryByText(explanation)).not.toBeInTheDocument();
	} finally {
		jest.useRealTimers();
	}
});

it("allows clicking a dash to explain zero assigned hours", () => {
	render(
		<BeginRecordHours
			day={{
				...day,
				allocations: day.allocations?.map((item) => ({ ...item, hours: 0 })),
			}}
			recordId="record"
			value="—"
			hours={0}
			workers={2}
		/>,
	);
	fireEvent.click(screen.getByRole("button"));
	expect(screen.getByText(explanation)).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button"));
	expect(screen.queryByText(explanation)).not.toBeInTheDocument();
});

it("shows a rounded summary and keeps the original explanation collapsed", () => {
	render(
		<BeginRecordHours
			day={day}
			recordId="record"
			value="6,34"
			hours={761 / 60 / 2}
			workers={2}
		/>,
	);
	fireEvent.click(screen.getByRole("button"));
	const dialog = screen.getByRole("dialog");
	expect(dialog).toHaveTextContent("Stundas6,34");
	expect(dialog).toHaveTextContent("Darbinieki2");
	expect(dialog).toHaveTextContent("Cilvēkstundas12,68");
	expect(dialog).toHaveTextContent("25.09.2026");
	const original = screen.getByText(explanation);
	expect(original.closest("details")).not.toHaveAttribute("open");
	fireEvent.click(screen.getByText("Pilns skaidrojums"));
	expect(original.closest("details")).toHaveAttribute("open");
});

it.each([
	[
		"Begin brigāde — Ralfs 7:09, Igors 5:32; kopā 12:41 cilvēkstundas.",
		"7 h 09 min",
	],
	["Begin brigāde — Ralfs 429 min + Igors 332 min = 761 min.", "7 h 09 min"],
	["Begin brigāde — Ralfs, Igors.", "Nav norādīts"],
])("uses the same crew rows for %s", (text, duration) => {
	render(
		<BeginRecordHours
			day={{
				...day,
				allocations: day.allocations?.map((item) => ({
					...item,
					explanation: `${text} Atsevišķs darba ilgums nav norādīts.`,
				})),
			}}
			recordId="record"
			value="6,34"
			hours={761 / 60 / 2}
			workers={2}
		/>,
	);
	fireEvent.click(screen.getByRole("button"));
	expect(
		screen.getByRole("heading", { name: "Begin brigāde" }),
	).toBeInTheDocument();
	expect(screen.getByText("Ralfs").parentElement).toHaveTextContent(duration);
	expect(screen.getByText("Igors")).toBeInTheDocument();
	expect(
		screen.getByText("Atsevišķs darba ilgums nav norādīts."),
	).toBeVisible();
});

it.each(["hours", "workers", "import"])(
	"warns when the saved explanation is stale because of %s",
	(changed) => {
		render(
			<BeginRecordHours
				day={
					changed === "import"
						? { ...day, importedAt: "2026-09-29T07:00:00Z" }
						: day
				}
				recordId="record"
				value="6,34"
				hours={changed === "hours" ? 8 : 761 / 60 / 2}
				workers={changed === "workers" ? 3 : 2}
			/>,
		);
		fireEvent.click(screen.getByRole("button"));
		expect(screen.getByRole("status")).toHaveTextContent("mainījies");
		expect(screen.getByText(explanation)).toBeInTheDocument();
	},
);

it("does not invent an explanation or show a trigger for an unrelated record", () => {
	render(
		<BeginRecordHours
			day={day}
			recordId="different"
			value="8"
			hours={8}
			workers={2}
		/>,
	);
	expect(screen.getByText("8")).toBeInTheDocument();
	expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("opens from keyboard focus and closes with Escape", () => {
	render(
		<BeginRecordHours
			day={day}
			recordId="record"
			value="6,34"
			hours={761 / 60 / 2}
			workers={2}
		/>,
	);
	act(() => screen.getByRole("button").focus());
	expect(screen.getByText(explanation)).toBeInTheDocument();
	fireEvent.keyDown(screen.getByRole("button"), { key: "Escape" });
	expect(screen.queryByText(explanation)).not.toBeInTheDocument();
});

it("opens on tap and does not immediately close when the touch pointer leaves", () => {
	const original = window.PointerEvent;
	window.PointerEvent = class extends MouseEvent {
		readonly pointerType: string;
		constructor(type: string, init: PointerEventInit = {}) {
			super(type, init);
			this.pointerType = init.pointerType ?? "mouse";
		}
	} as unknown as typeof PointerEvent;
	jest.useFakeTimers();
	try {
		render(
			<BeginRecordHours
				day={day}
				recordId="record"
				value="6,34"
				hours={761 / 60 / 2}
				workers={2}
			/>,
		);
		const trigger = screen.getByRole("button");
		fireEvent.pointerEnter(trigger, { pointerType: "touch" });
		expect(screen.queryByText(explanation)).not.toBeInTheDocument();
		fireEvent.click(trigger);
		fireEvent.pointerLeave(trigger, { pointerType: "touch" });
		act(() => jest.advanceTimersByTime(250));
		expect(screen.getByText(explanation)).toBeInTheDocument();
	} finally {
		window.PointerEvent = original;
		jest.useRealTimers();
	}
});
