import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DIARY_RECORD_UPDATED } from "../lib/diary-record-updated-event";
import { getVisualWorkTypes, saveVisualWorkType } from "./actions";
import { VisualWorkEditor } from "./VisualWorkEditor";

jest.mock("./actions", () => ({
	getVisualWorkTypes: jest.fn(),
	saveVisualWorkType: jest.fn(),
}));
const source = {
	id: "photo",
	recordId: "record",
	work: "XPS",
	location: "1. stāvs",
	photoUrl: "https://example.com/a.jpg",
	description: "Done",
	amount: 10,
	unit: "m2",
	date: null,
};
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getVisualWorkTypes).mockResolvedValue(["XPS", "Smilts"]);
});

it("saves a work type immediately after selection and invalidates the journal", async () => {
	const saved = {
		id: "drawing",
		state: { evidence: [{ ...source, work: "Smilts" }] },
	};
	jest.mocked(saveVisualWorkType).mockResolvedValue(saved as never);
	const onSaved = jest.fn(),
		onEditingChange = jest.fn(),
		changed = jest.fn();
	window.addEventListener(DIARY_RECORD_UPDATED, changed);
	render(
		<VisualWorkEditor
			siteId="site"
			drawingId="drawing"
			source={source}
			disabled={false}
			onSaved={onSaved}
			onEditingChange={onEditingChange}
		/>,
	);
	await screen.findByRole("option", { name: "Smilts" });
	fireEvent.change(screen.getByRole("combobox", { name: "Darba tips" }), {
		target: { value: "Smilts" },
	});
	expect(onEditingChange).toHaveBeenLastCalledWith(true);
	expect(
		screen.queryByRole("button", { name: "Saglabāt" }),
	).not.toBeInTheDocument();
	await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
	expect(saveVisualWorkType).toHaveBeenCalledWith("site", "drawing", {
		evidenceId: "photo",
		expectedWork: "XPS",
		work: "Smilts",
	});
	expect(changed).toHaveBeenCalledTimes(1);
	window.removeEventListener(DIARY_RECORD_UPDATED, changed);
});

it("keeps failed changes visible for retry and lets the user cancel", async () => {
	jest
		.mocked(saveVisualWorkType)
		.mockRejectedValue(new Error("Concurrent edit"));
	const onSaved = jest.fn();
	render(
		<VisualWorkEditor
			siteId="site"
			drawingId="drawing"
			source={source}
			disabled={false}
			onSaved={onSaved}
			onEditingChange={jest.fn()}
		/>,
	);
	await screen.findByRole("option", { name: "Smilts" });
	const select = screen.getByRole("combobox");
	fireEvent.change(select, { target: { value: "Smilts" } });
	expect(await screen.findByRole("alert")).toHaveTextContent("Concurrent edit");
	fireEvent.click(screen.getByRole("button", { name: "Atcelt" }));
	expect(select).toHaveValue("XPS");
	fireEvent.change(select, { target: { value: "Smilts" } });
	expect(await screen.findByRole("alert")).toHaveTextContent("Concurrent edit");
	fireEvent.click(screen.getByRole("button", { name: "Mēģināt vēlreiz" }));
	await waitFor(() => expect(saveVisualWorkType).toHaveBeenCalledTimes(3));
	expect(select).toHaveValue("Smilts");
	expect(onSaved).not.toHaveBeenCalled();
});
