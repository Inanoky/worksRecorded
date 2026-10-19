import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { notifyDiaryRecordUpdated } from "../lib/diary-record-updated-event";
import { addVisualRecord } from "./actions";
import { VisualRecordForm } from "./VisualRecordForm";

jest.mock("./actions", () => ({ addVisualRecord: jest.fn() }));
jest.mock("../lib/diary-record-updated-event", () => ({
	notifyDiaryRecordUpdated: jest.fn(),
}));

const props = {
	siteId: "site",
	drawingId: "drawing",
	recordId: "c2203b2d-21a5-4c2c-aeca-ad1162e08290",
	location: "1. stāvs",
	areas: [
		{
			id: "area",
			page: 1,
			polygon: [
				{ x: 0.1, y: 0.1 },
				{ x: 0.4, y: 0.1 },
				{ x: 0.4, y: 0.4 },
			],
		},
	],
	workOptions: ["XPS"],
	hidden: false,
	onSavingChange: jest.fn(),
	onSaved: jest.fn(),
	onCancel: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it("requires actual work and positive quantity before saving the drawn area", () => {
	render(<VisualRecordForm {...props} />);
	const save = screen.getByRole("button", { name: "Saglabāt ierakstu" });
	expect(save).toBeDisabled();
	fireEvent.change(screen.getByLabelText("Darbs"), {
		target: { value: "XPS" },
	});
	fireEvent.change(screen.getByLabelText("Daudzums"), {
		target: { value: "0" },
	});
	expect(save).toBeDisabled();
	fireEvent.change(screen.getByLabelText("Daudzums"), {
		target: { value: "85" },
	});
	expect(save).toBeEnabled();
});

it("retains the same record id, geometry and entered fields when retrying a failed save", async () => {
	jest
		.mocked(addVisualRecord)
		.mockResolvedValue({ ok: false, error: "Mēģiniet vēlreiz." });
	render(<VisualRecordForm {...props} />);
	fireEvent.change(screen.getByLabelText("Darbs"), {
		target: { value: "XPS" },
	});
	fireEvent.change(screen.getByLabelText("Daudzums"), {
		target: { value: "85" },
	});
	fireEvent.change(screen.getByLabelText("Izpildes datums"), {
		target: { value: "2026-10-19" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt ierakstu" }));
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Mēģiniet vēlreiz.",
	);
	expect(screen.getByLabelText("Darbs")).toHaveValue("XPS");
	expect(screen.getByLabelText("Daudzums")).toHaveValue(85);
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt ierakstu" }));
	await waitFor(() => expect(addVisualRecord).toHaveBeenCalledTimes(2));
	expect(jest.mocked(addVisualRecord).mock.calls[0]).toEqual(
		jest.mocked(addVisualRecord).mock.calls[1],
	);
	expect(addVisualRecord).toHaveBeenCalledWith(
		"site",
		"drawing",
		expect.objectContaining({
			id: props.recordId,
			areas: props.areas,
			date: "2026-10-19",
			quantity: 85,
		}),
	);
	expect(props.onSaved).not.toHaveBeenCalled();
});

it("invalidates the retained diary and hands the saved zone back to the workspace", async () => {
	const result = {
		ok: true,
		drawing: { id: "drawing" },
		markId: "new-mark",
	} as const;
	jest.mocked(addVisualRecord).mockResolvedValue(result as never);
	render(<VisualRecordForm {...props} />);
	fireEvent.change(screen.getByLabelText("Darbs"), {
		target: { value: "XPS" },
	});
	fireEvent.change(screen.getByLabelText("Daudzums"), {
		target: { value: "85" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt ierakstu" }));
	await waitFor(() => expect(props.onSaved).toHaveBeenCalledWith(result));
	expect(notifyDiaryRecordUpdated).toHaveBeenCalledWith("site");
});
