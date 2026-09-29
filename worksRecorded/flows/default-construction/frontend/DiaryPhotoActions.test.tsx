import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	DiaryPhotoActions,
	DiaryPhotoUploadMenuItem,
} from "./DiaryPhotoActions";

const upload = jest.fn();
const refresh = jest.fn();
const success = jest.fn();
const error = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("sonner", () => ({
	toast: {
		success: (...args: unknown[]) => success(...args),
		error: (...args: unknown[]) => error(...args),
	},
}));
jest.mock("@/lib/utils/UploadthingsComponents", () => ({
	useUploadThing: () => ({ startUpload: upload }),
}));
function menu(onUploaded = jest.fn()) {
	render(
		<DropdownMenu open>
			<DropdownMenuTrigger>Actions</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DiaryPhotoUploadMenuItem
					siteId="site"
					recordId="record"
					onUploaded={onUploaded}
				/>
			</DropdownMenuContent>
		</DropdownMenu>,
	);
	return onUploaded;
}
beforeEach(() => jest.clearAllMocks());
it("only shows the upload option inside the actions menu", () => {
	render(<DiaryPhotoActions siteId="site" recordId="record" />);
	expect(screen.getByRole("button", { name: "Darbības" })).toBeInTheDocument();
	expect(screen.queryByText("Pievienot foto")).toBeNull();
});
it("opens the file picker from a menu item without dismissing the menu", () => {
	menu();
	const input = screen.getByLabelText("Izvēlēties foto");
	const click = jest.spyOn(input, "click").mockImplementation(() => {});
	fireEvent.click(screen.getByRole("menuitem", { name: "Pievienot foto" }));
	expect(click).toHaveBeenCalled();
	expect(
		screen.getByRole("menuitem", { name: "Pievienot foto" }),
	).toBeInTheDocument();
});
it("uploads to the selected record and refreshes the photos", async () => {
	upload.mockResolvedValue([
		{ serverData: { photos: ["https://host/old", "https://host/new"] } },
	]);
	const onUploaded = menu();
	const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
	fireEvent.change(screen.getByLabelText("Izvēlēties foto"), {
		target: { files: [file] },
	});
	await waitFor(() => expect(success).toHaveBeenCalled());
	expect(upload).toHaveBeenCalledWith([file], {
		siteId: "site",
		recordId: "record",
	});
	expect(onUploaded).toHaveBeenCalledWith([
		"https://host/old",
		"https://host/new",
	]);
	expect(refresh).toHaveBeenCalled();
});
it("rejects non-images before uploading", () => {
	menu();
	fireEvent.change(screen.getByLabelText("Izvēlēties foto"), {
		target: { files: [new File(["x"], "x.pdf", { type: "application/pdf" })] },
	});
	expect(upload).not.toHaveBeenCalled();
	expect(error).toHaveBeenCalled();
});
it("reports failures and restores the menu action", async () => {
	upload.mockRejectedValue(new Error("network"));
	menu();
	fireEvent.change(screen.getByLabelText("Izvēlēties foto"), {
		target: { files: [new File(["x"], "x.png", { type: "image/png" })] },
	});
	await waitFor(() => expect(error).toHaveBeenCalled());
	expect(
		screen.getByRole("menuitem", { name: "Pievienot foto" }),
	).not.toHaveAttribute("data-disabled");
});
