import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { updateFimaDiaryField } from "@/server/actions/fima-diary-inline";
import { FimaInlineCell } from "./FimaInlineCell";

jest.mock("@/server/actions/fima-diary-inline", () => ({
	updateFimaDiaryField: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
beforeEach(() => jest.resetAllMocks());
const base = { siteId: "site", recordId: "record", onSaved: jest.fn() };
it("keeps text selectable through a click and double click without starting an edit", () => {
	render(<FimaInlineCell {...base} field="Works" value="Konsoles montāža" />);
	const text = screen.getByText("Konsoles montāža");
	const selection = window.getSelection();
	const range = document.createRange();
	range.selectNodeContents(text);
	selection?.removeAllRanges();
	selection?.addRange(range);
	fireEvent.mouseDown(text);
	fireEvent.mouseUp(text);
	fireEvent.click(text);
	fireEvent.doubleClick(text);
	expect(selection?.toString()).toBe("Konsoles montāža");
	expect(text.closest("button")).toBeNull();
	expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	expect(updateFimaDiaryField).not.toHaveBeenCalled();
	selection?.removeAllRanges();
});
it("edits a description inline and saves the original value for conflict detection", async () => {
	jest
		.mocked(updateFimaDiaryField)
		.mockResolvedValue({ field: "Works", value: "Updated" });
	render(<FimaInlineCell {...base} field="Works" value="Original" />);
	fireEvent.click(
		screen.getByRole("button", { name: "Rediģēt: Darba apraksts" }),
	);
	const input = screen.getByLabelText("Rediģēt: Darba apraksts");
	fireEvent.change(input, { target: { value: "Updated" } });
	fireEvent.blur(input);
	await waitFor(() =>
		expect(base.onSaved).toHaveBeenCalledWith("record", "Works", "Updated"),
	);
	expect(updateFimaDiaryField).toHaveBeenCalledWith({
		siteId: "site",
		recordId: "record",
		field: "Works",
		value: "Updated",
		expectedValue: "Original",
	});
});
it("cancels on Escape without saving", () => {
	render(<FimaInlineCell {...base} field="Amounts" value={0} />);
	fireEvent.click(screen.getByRole("button", { name: "Rediģēt: Apjoms" }));
	fireEvent.change(screen.getByLabelText("Rediģēt: Apjoms"), {
		target: { value: "99" },
	});
	fireEvent.keyDown(screen.getByLabelText("Rediģēt: Apjoms"), {
		key: "Escape",
	});
	expect(updateFimaDiaryField).not.toHaveBeenCalled();
	expect(screen.getByText("0")).toBeInTheDocument();
});
it("retains a failed draft and does not replace the confirmed record value", async () => {
	jest.mocked(updateFimaDiaryField).mockRejectedValue(new Error("Conflict"));
	render(<FimaInlineCell {...base} field="Units" value="m" />);
	fireEvent.click(screen.getByRole("button", { name: "Rediģēt: Mērvienība" }));
	const input = screen.getByLabelText("Rediģēt: Mērvienība");
	fireEvent.change(input, { target: { value: "gab." } });
	fireEvent.keyDown(input, { key: "Enter" });
	await waitFor(() => expect(input).not.toBeDisabled());
	expect(input).toHaveValue("gab.");
	expect(base.onSaved).not.toHaveBeenCalled();
});
