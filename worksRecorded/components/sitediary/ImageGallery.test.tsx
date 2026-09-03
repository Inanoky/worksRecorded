import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { ImageGallery } from "@/components/sitediary/ImageGallery";

const mockGetPhotosByDate = jest.fn();
const mockDeletePhotoById = jest.fn();
const mockMovePhotosToDate = jest.fn();

type MockNextImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
	fill?: boolean;
	priority?: boolean;
	sizes?: string;
	unoptimized?: boolean;
};

jest.mock("next/image", () => ({
	__esModule: true,
	default: ({
		fill: _fill,
		priority: _priority,
		sizes: _sizes,
		unoptimized: _unoptimized,
		...props
	}: MockNextImageProps) => React.createElement("img", props),
}));

jest.mock("@/server/actions/site-diary-actions", () => ({
	getPhotosByDate: (...args: unknown[]) => mockGetPhotosByDate(...args),
	deletePhotoById: (...args: unknown[]) => mockDeletePhotoById(...args),
	movePhotosToDate: (...args: unknown[]) => mockMovePhotosToDate(...args),
}));

describe("ImageGallery photo moves", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetPhotosByDate.mockResolvedValue({
			photos: [
				{
					id: "photo-1",
					Date: new Date("2026-08-05T09:00:00.000Z"),
					URL: "https://ut.test.ufs.sh/f/progress.jpg",
					fileUrl: "https://ut.test.ufs.sh/f/progress.jpg",
					Comment: "Progress photo",
					Location: "Site A",
					siteId: "site-1",
					userId: "user-1",
				},
				{
					id: "photo-2",
					Date: new Date("2026-08-05T09:05:00.000Z"),
					URL: "https://ut.test.ufs.sh/f/progress-2.jpg",
					fileUrl: "https://ut.test.ufs.sh/f/progress-2.jpg",
					Comment: "Second progress photo",
					Location: "Site A",
					siteId: "site-1",
					userId: "user-1",
				},
			],
			audioRecords: [],
		});
		mockMovePhotosToDate.mockResolvedValue({ ok: true, movedCount: 2 });
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("moves selected photos to the selected date and refreshes outer media state", async () => {
		const onMediaChanged = jest.fn();

		render(
			<ImageGallery
				date={new Date("2026-08-05T12:00:00.000Z")}
				siteId="site-1"
				onMediaChanged={onMediaChanged}
			/>,
		);

		expect(await screen.findByText("Regular viewer mode")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Select mode" }));
		expect(screen.getByText("Select mode")).toBeInTheDocument();

		fireEvent.click(
			await screen.findByRole("button", { name: "Progress photo" }),
		);
		fireEvent.click(
			await screen.findByRole("button", { name: "Second progress photo" }),
		);

		const moveDate = screen.getByLabelText("Move photo to date");
		fireEvent.change(moveDate, { target: { value: "2026-08-06" } });
		const moveButton = screen.getByRole("button", { name: "Move selected" });
		await waitFor(() => expect(moveButton).not.toBeDisabled());
		fireEvent.click(moveButton);

		await waitFor(() => {
			expect(mockMovePhotosToDate).toHaveBeenCalledWith({
				photoIds: ["photo-1", "photo-2"],
				targetDate: "2026-08-06",
			});
		});
		expect(onMediaChanged).toHaveBeenCalledTimes(1);
		expect(screen.queryByAltText("Progress photo")).not.toBeInTheDocument();
		expect(
			screen.queryByAltText("Second progress photo"),
		).not.toBeInTheDocument();
	});

	it("shows stable loading skeletons while media rows are loading", async () => {
		let resolvePhotos: (value: { photos: []; audioRecords: [] }) => void =
			() => {};
		mockGetPhotosByDate.mockReturnValueOnce(
			new Promise((resolve) => {
				resolvePhotos = resolve;
			}),
		);

		const { container } = render(
			<ImageGallery
				date={new Date("2026-08-05T12:00:00.000Z")}
				siteId="site-1"
			/>,
		);

		await waitFor(() => {
			expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
				10,
			);
		});

		resolvePhotos({ photos: [], audioRecords: [] });

		await waitFor(() => {
			expect(
				screen.getByText("No photos or voice messages for this date."),
			).toBeInTheDocument();
		});
	});

	it("keeps thumbnail skeletons until each image loads", async () => {
		render(
			<ImageGallery
				date={new Date("2026-08-05T12:00:00.000Z")}
				siteId="site-1"
			/>,
		);

		expect(await screen.findByText("Regular viewer mode")).toBeInTheDocument();
		expect(screen.getAllByLabelText("Photo loading")).toHaveLength(2);

		fireEvent.load(screen.getByAltText("Progress photo"));

		await waitFor(() => {
			expect(screen.getAllByLabelText("Photo loading")).toHaveLength(1);
		});
	});

	it("opens the lightbox in regular viewer mode", async () => {
		render(
			<ImageGallery
				date={new Date("2026-08-05T12:00:00.000Z")}
				siteId="site-1"
			/>,
		);

		fireEvent.click(
			await screen.findByRole("button", { name: "Progress photo" }),
		);

		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("1 / 2")).toBeInTheDocument();
	});

	it("selects photos instead of opening the lightbox in select mode", async () => {
		render(
			<ImageGallery
				date={new Date("2026-08-05T12:00:00.000Z")}
				siteId="site-1"
			/>,
		);

		expect(await screen.findByText("Regular viewer mode")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Select mode" }));
		fireEvent.click(screen.getByRole("button", { name: "Progress photo" }));

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.getByText("1 selected")).toBeInTheDocument();
	});

	it("requires confirmation before deleting a photo", async () => {
		const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
		mockDeletePhotoById.mockResolvedValue({ ok: true });

		render(
			<ImageGallery
				date={new Date("2026-08-05T12:00:00.000Z")}
				siteId="site-1"
			/>,
		);

		expect(await screen.findByAltText("Progress photo")).toBeInTheDocument();
		fireEvent.click(screen.getAllByRole("button", { name: "Delete photo" })[0]);

		expect(confirmSpy).toHaveBeenCalledWith(
			"Delete this photo? This cannot be undone.",
		);
		expect(mockDeletePhotoById).not.toHaveBeenCalled();
		expect(screen.getByAltText("Progress photo")).toBeInTheDocument();

		confirmSpy.mockRestore();
	});
});
