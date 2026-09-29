import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EditableDiaryRecordPhotos } from "./EditableDiaryRecordPhotos";
const upload = jest.fn();
jest.mock("@/lib/utils/UploadthingsComponents", () => ({
	useUploadThing: () => ({ startUpload: upload }),
}));
jest.mock("./DiaryRecordPhotos", () => ({
	DiaryRecordPhotos: ({ photos }: { photos: string[] }) => (
		<div data-testid="photos">{photos.join(",")}</div>
	),
}));
beforeEach(() => jest.resetAllMocks());
it("uploads to the selected record and retains existing photos", async () => {
	upload.mockResolvedValue([{ serverData: { photos: ["https://host/new"] } }]);
	render(
		<EditableDiaryRecordPhotos
			siteId="site"
			recordId="record"
			photos={["https://host/old"]}
		/>,
	);
	const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
	fireEvent.change(screen.getByLabelText("Izvēlēties foto"), {
		target: { files: [file] },
	});
	await waitFor(() =>
		expect(screen.getByTestId("photos")).toHaveTextContent(
			"https://host/old,https://host/new",
		),
	);
	expect(upload).toHaveBeenCalledWith([file], {
		siteId: "site",
		recordId: "record",
	});
	expect(screen.getByRole("button", { name: "Pievienot foto" })).toBeEnabled();
});
it("rejects non-image files before uploading", () => {
	render(
		<EditableDiaryRecordPhotos siteId="site" recordId="record" photos={[]} />,
	);
	fireEvent.change(screen.getByLabelText("Izvēlēties foto"), {
		target: { files: [new File(["x"], "x.pdf", { type: "application/pdf" })] },
	});
	expect(upload).not.toHaveBeenCalled();
	expect(screen.getByRole("alert")).toHaveTextContent("16 MB");
});
it("restores the button after an error and keeps existing images", async () => {
	upload.mockRejectedValue(new Error("network"));
	render(
		<EditableDiaryRecordPhotos
			siteId="site"
			recordId="record"
			photos={["https://host/old"]}
		/>,
	);
	fireEvent.change(screen.getByLabelText("Izvēlēties foto"), {
		target: { files: [new File(["x"], "x.png", { type: "image/png" })] },
	});
	await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
	expect(screen.getByTestId("photos")).toHaveTextContent("https://host/old");
	expect(screen.getByRole("button", { name: "Pievienot foto" })).toBeEnabled();
});
it("does not offer uploads for unsaved records", () => {
	render(<EditableDiaryRecordPhotos photos={[]} siteId="site" />);
	expect(screen.queryByRole("button")).toBeNull();
});
