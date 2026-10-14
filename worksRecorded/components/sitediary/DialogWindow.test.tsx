import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DialogWindow from "./DialogWindow";

const changes = { rows: [], createdIds: [] };
jest.mock("@/components/joyride/TourRunner", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("@/components/sitediary/ImageGallery", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("@/flows/ztc-production/frontend/ZtcDialogTable", () => ({
	ZtcDialogTable: () => null,
}));
jest.mock("@/components/sitediary/DiealogueTable", () => ({
	DialogTable: ({
		onSaved,
		onQueued,
	}: {
		onSaved: (changes?: unknown) => void;
		onQueued: () => void;
	}) => (
		<>
			<button type="button" onClick={() => onSaved(changes)}>
				Test save
			</button>
			<button type="button" onClick={onQueued}>
				Test queued
			</button>
		</>
	),
}));

it("closes after durable enqueue without waiting for the server or triggering a reload", () => {
	const setOpen = jest.fn();
	const onSaved = jest.fn();
	render(
		<DialogWindow
			open
			setOpen={setOpen}
			date={new Date()}
			siteId="site"
			onSaved={onSaved}
			batchEditing
		/>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Test queued" }));
	expect(setOpen).toHaveBeenCalledWith(false);
	expect(onSaved).not.toHaveBeenCalled();
});

it("does not remount the Default Construction editor after an acknowledged batch save", async () => {
	const onSaved = jest.fn();
	render(
		<DialogWindow
			open
			setOpen={jest.fn()}
			date={new Date()}
			siteId="site"
			onSaved={onSaved}
			batchEditing
		/>,
	);
	const button = screen.getByRole("button", { name: "Test save" });
	fireEvent.click(button);
	await waitFor(() => expect(onSaved).toHaveBeenCalledWith(changes));
	expect(screen.getByRole("button", { name: "Test save" })).toBe(button);
});

it("keeps the legacy refresh behavior when batch editing is not enabled", async () => {
	render(
		<DialogWindow
			open
			setOpen={jest.fn()}
			date={new Date()}
			siteId="site"
			onSaved={jest.fn()}
		/>,
	);
	const button = screen.getByRole("button", { name: "Test save" });
	fireEvent.click(button);
	await waitFor(() =>
		expect(screen.getByRole("button", { name: "Test save" })).not.toBe(button),
	);
});
