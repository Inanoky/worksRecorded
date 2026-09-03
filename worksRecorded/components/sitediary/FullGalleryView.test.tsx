import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import FullPhotoGallery from "@/components/sitediary/FullGalleryView";

const mockDeletePhotoById = jest.fn();

type MockNextImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
	fill?: boolean;
	priority?: boolean;
	sizes?: string;
	unoptimized?: boolean;
};

jest.mock("next/image", () => ({
	__esModule: true,
	default: React.forwardRef<HTMLImageElement, MockNextImageProps>(
		(
			{
				fill: _fill,
				priority: _priority,
				sizes: _sizes,
				unoptimized: _unoptimized,
				...props
			},
			ref,
		) => React.createElement("img", { ...props, ref }),
	),
}));

jest.mock("@/server/actions/site-diary-actions", () => ({
	deletePhotoById: (...args: unknown[]) => mockDeletePhotoById(...args),
}));

const pageOnePhotos = [
	{
		id: "photo-1",
		fileUrl: "https://ut.test.ufs.sh/f/first.jpg",
		Date: "2026-08-05T09:00:00.000Z",
		Comment: "First photo",
		Location: "Site A",
	},
	{
		id: "photo-2",
		fileUrl: "https://ut.test.ufs.sh/f/second.jpg",
		Date: "2026-08-05T09:10:00.000Z",
		Comment: "Second photo",
		Location: "Site A",
	},
	{
		id: "photo-3",
		fileUrl: "https://ut.test.ufs.sh/f/third.jpg",
		Date: "2026-08-05T09:20:00.000Z",
		Comment: "Third photo",
		Location: "Site A",
	},
];

function mockFetchResponse(photos = pageOnePhotos, totalCount = photos.length) {
	return {
		ok: true,
		json: async () => ({ photos, totalCount }),
	} as Response;
}

describe("FullPhotoGallery", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		global.fetch = jest.fn().mockResolvedValue(mockFetchResponse());
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("renders grid skeletons while the route request is pending", async () => {
		let resolveFetch: (value: Response) => void = () => {};
		global.fetch = jest.fn().mockReturnValue(
			new Promise((resolve) => {
				resolveFetch = resolve;
			}),
		);

		render(<FullPhotoGallery siteId="site-1" />);

		expect(await screen.findAllByTestId("full-gallery-skeleton")).toHaveLength(
			12,
		);

		resolveFetch(mockFetchResponse());
		expect(
			await screen.findByText("Project Photo Gallery (3 Total Photos)"),
		).toBeInTheDocument();
	});

	it("switches to the next and previous photo immediately while the image loads", async () => {
		render(<FullPhotoGallery siteId="site-1" />);

		fireEvent.click(await screen.findByAltText("First photo"));

		expect(screen.getByText("Photo 1 of 3 (Page 1 of 1)")).toBeInTheDocument();
		expect(screen.getByText("Ielādē foto...")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Next photo" }));

		expect(screen.getByText("Photo 2 of 3 (Page 1 of 1)")).toBeInTheDocument();
		expect(screen.getByText("Ielādē foto...")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));

		expect(screen.getByText("Photo 1 of 3 (Page 1 of 1)")).toBeInTheDocument();
	});

	it("settles rapid arrow clicks on the latest requested photo", async () => {
		render(<FullPhotoGallery siteId="site-1" />);

		fireEvent.click(await screen.findByAltText("First photo"));
		const nextButton = screen.getByRole("button", { name: "Next photo" });

		fireEvent.click(nextButton);
		fireEvent.click(nextButton);

		expect(screen.getByText("Photo 3 of 3 (Page 1 of 1)")).toBeInTheDocument();
	});

	it("clears the viewer loading overlay after the selected image loads", async () => {
		render(<FullPhotoGallery siteId="site-1" />);

		fireEvent.click(await screen.findByAltText("First photo"));
		expect(screen.getByText("Ielādē foto...")).toBeInTheDocument();

		const expandedImage = screen.getAllByAltText("First photo").at(-1);
		expect(expandedImage).toBeDefined();
		fireEvent.load(expandedImage as HTMLElement);

		await waitFor(() => {
			expect(screen.queryByText("Ielādē foto...")).not.toBeInTheDocument();
		});
	});

	it("keeps pagination inside available page bounds", async () => {
		global.fetch = jest.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			const page = new URL(url, "http://localhost").searchParams.get("page");
			return mockFetchResponse(
				[
					{
						...pageOnePhotos[0],
						id: `photo-page-${page}`,
						Comment: `Page ${page} photo`,
					},
				],
				60,
			);
		});

		render(<FullPhotoGallery siteId="site-1" />);

		expect(
			await screen.findByText("Project Photo Gallery (60 Total Photos)"),
		).toBeInTheDocument();

		fireEvent.click(screen.getAllByLabelText("Go to previous page")[0]);
		expect(global.fetch).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getAllByLabelText("Go to next page")[0]);

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				"/api/sites/site-1/photos?page=2",
			);
		});
		expect(await screen.findByAltText("Page 2 photo")).toBeInTheDocument();

		fireEvent.click(screen.getAllByLabelText("Go to next page")[0]);

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledTimes(2);
			expect(global.fetch).not.toHaveBeenCalledWith(
				"/api/sites/site-1/photos?page=3",
			);
		});
	});
});
