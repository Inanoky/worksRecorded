import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { TgemProjectDeleteCard } from "./TgemProjectDeleteCard";

const mockDelete = jest.fn();
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
jest.mock("@/server/actions/tgem-project-actions", () => ({
	deleteTgemProject: (...args: unknown[]) => mockDelete(...args),
}));

beforeEach(() => {
	jest.resetAllMocks();
	mockDelete.mockResolvedValue({ ok: true });
});

function openConfirmation(language = "en") {
	render(
		<TgemProjectDeleteCard
			project={{ id: "site-1", name: "Test project" }}
			organizationLanguage={language}
		/>,
	);
	fireEvent.click(
		screen.getByRole("button", {
			name: language === "lv" ? "Dzēst projektu" : "Delete project",
		}),
	);
	return screen.getByRole("alertdialog");
}

it("requires confirmation and cancel leaves data untouched", () => {
	const dialog = openConfirmation();
	expect(within(dialog).getByText("Test project")).toBeInTheDocument();
	expect(
		within(dialog).getByText(/TGEM invoices will be kept/),
	).toBeInTheDocument();
	expect(mockDelete).not.toHaveBeenCalled();
	fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
	expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	expect(mockDelete).not.toHaveBeenCalled();
});

it("deletes only the confirmed project and returns to the project list", async () => {
	openConfirmation();
	fireEvent.click(screen.getByRole("button", { name: "Yes, delete project" }));
	await waitFor(() =>
		expect(mockPush).toHaveBeenCalledWith("/dashboard/sites"),
	);
	expect(mockDelete).toHaveBeenCalledWith("site-1");
	expect(mockDelete).toHaveBeenCalledTimes(1);
	expect(mockRefresh).toHaveBeenCalledTimes(1);
});

it.each(["denied", "exception"])(
	"keeps confirmation open for retry after %s",
	async (failure) => {
		if (failure === "denied")
			mockDelete.mockResolvedValueOnce({ ok: false, error: "access_denied" });
		else mockDelete.mockRejectedValueOnce(new Error("Private database detail"));
		openConfirmation();
		fireEvent.click(
			screen.getByRole("button", { name: "Yes, delete project" }),
		);
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Could not delete the project.",
		);
		expect(
			screen.queryByText("Private database detail"),
		).not.toBeInTheDocument();
		expect(mockPush).not.toHaveBeenCalled();
		fireEvent.click(
			screen.getByRole("button", { name: "Yes, delete project" }),
		);
		await waitFor(() => expect(mockPush).toHaveBeenCalled());
	},
);

it("prevents repeat submissions while pending", async () => {
	let finish!: (value: { ok: true }) => void;
	mockDelete.mockReturnValue(
		new Promise((resolve) => {
			finish = resolve;
		}),
	);
	openConfirmation();
	fireEvent.click(screen.getByRole("button", { name: "Yes, delete project" }));
	const pending = screen.getByRole("button", { name: "Deleting…" });
	expect(pending).toBeDisabled();
	expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
	fireEvent.click(pending);
	expect(mockDelete).toHaveBeenCalledTimes(1);
	await act(async () => finish({ ok: true }));
});

it("provides Latvian confirmation", () => {
	const dialog = openConfirmation("lv");
	expect(
		within(dialog).getByRole("button", { name: "Jā, dzēst projektu" }),
	).toBeInTheDocument();
});
