import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { FimaNumberCell } from "./FimaNumberCell";

jest.mock("sonner", () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));
const writeText = jest.fn();
const originalClipboard = Object.getOwnPropertyDescriptor(
	navigator,
	"clipboard",
);
beforeEach(() => {
	jest.resetAllMocks();
	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value: { writeText },
	});
});
afterAll(() => {
	if (originalClipboard)
		Object.defineProperty(navigator, "clipboard", originalClipboard);
	else Reflect.deleteProperty(navigator, "clipboard");
});

it("keeps the number as selectable text and copies the full identifier only through its copy button", async () => {
	writeText.mockResolvedValue(undefined);
	render(<FimaNumberCell value={42} />);
	const number = screen.getByText("FIMA-000042");
	fireEvent.mouseDown(number);
	fireEvent.mouseUp(number);
	fireEvent.click(number);
	expect(number.closest("button")).toBeNull();
	expect(writeText).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Kopēt FIMA-000042" }));
	expect(writeText).toHaveBeenCalledWith("FIMA-000042");
	await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Nokopēts"));
});

it("allows manual copying when clipboard access fails", async () => {
	writeText.mockRejectedValue(new Error("Permission denied"));
	render(<FimaNumberCell value={42} />);
	fireEvent.click(screen.getByRole("button", { name: "Kopēt FIMA-000042" }));
	await waitFor(() => expect(toast.error).toHaveBeenCalled());
	expect(screen.getByText("FIMA-000042")).toBeInTheDocument();
	expect(toast.success).not.toHaveBeenCalled();
});

it("does not offer a copy action for an unassigned number", () => {
	render(<FimaNumberCell value={null} />);
	expect(screen.getByText("—")).toBeInTheDocument();
	expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
