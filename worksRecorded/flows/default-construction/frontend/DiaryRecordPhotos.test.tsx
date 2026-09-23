import {
	fireEvent,
	render,
	screen,
	within,
	waitFor,
} from "@testing-library/react";
import { DiaryRecordPhotos } from "./DiaryRecordPhotos";

jest.mock("next/image", () => ({
	__esModule: true,
	default: ({ fill, sizes, unoptimized, ...props }: any) => (
		<img data-unoptimized={unoptimized || undefined} {...props} />
	),
}));

it("shows a placeholder when there are no photos", () => {
	render(<DiaryRecordPhotos photos={null} />);
	expect(screen.getByText("—")).toBeInTheDocument();
	expect(screen.queryByRole("img")).toBeNull();
});
it("reuses the original download URL rather than requesting another optimized image", async () => {
	render(<DiaryRecordPhotos photos={["https://utfs.io/f/1"]} />);
	expect(screen.getByRole("img")).toHaveAttribute("data-unoptimized", "true");
	fireEvent.focus(screen.getByRole("button", { name: "Ziņojuma foto 1" }));
	await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));
	for (const image of screen.getAllByRole("img")) {
		expect(image).toHaveAttribute("src", "https://utfs.io/f/1");
		expect(image).toHaveAttribute("data-unoptimized", "true");
	}
});
it("expands the photo on keyboard focus without opening a modal", async () => {
	render(<DiaryRecordPhotos photos={["https://utfs.io/f/1"]} />);
	const trigger = screen.getByRole("button", { name: "Ziņojuma foto 1" });
	fireEvent.focus(trigger);
	await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));
	expect(screen.queryByRole("dialog")).toBeNull();
	fireEvent.blur(trigger);
	await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));
});
it("expands on pointer hover and keeps the full-size modal on click", async () => {
	render(<DiaryRecordPhotos photos={["https://utfs.io/f/1"]} />);
	const trigger = screen.getByRole("button", { name: "Ziņojuma foto 1" });
	fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
	await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));
	expect(screen.queryByRole("dialog")).toBeNull();
	fireEvent.click(trigger);
	expect(screen.getByRole("dialog")).toBeInTheDocument();
	expect(document.querySelector('[data-slot="hover-card-content"]')).toBeNull();
});
it("shows the first thumbnail and expands remaining photos inline", () => {
	render(
		<DiaryRecordPhotos
			photos={["https://utfs.io/f/1", "https://utfs.io/f/2"]}
		/>,
	);
	expect(screen.getAllByRole("img")).toHaveLength(1);
	fireEvent.click(screen.getByRole("button", { name: "+1 foto" }));
	expect(screen.getAllByRole("img")).toHaveLength(2);
	fireEvent.click(screen.getByRole("button", { name: "Rādīt mazāk" }));
	expect(screen.getAllByRole("img")).toHaveLength(1);
});
it("shows the cached thumbnail immediately until the sharp preview loads", async () => {
	render(<DiaryRecordPhotos photos={["https://utfs.io/f/1"]} />);
	const thumbnail = screen.getByRole("img");
	Object.defineProperty(thumbnail, "currentSrc", {
		value: "https://app.test/_next/image?url=photo&w=128",
		configurable: true,
	});
	fireEvent.load(thumbnail);
	fireEvent.pointerEnter(
		screen.getByRole("button", { name: "Ziņojuma foto 1" }),
		{ pointerType: "mouse" },
	);
	await waitFor(() =>
		expect(
			document.querySelector('[data-slot="hover-card-content"]'),
		).not.toBeNull(),
	);
	const preview = document.querySelector(
		'[data-slot="hover-card-content"]',
	) as HTMLElement;
	const cached = preview.querySelector('img[aria-hidden="true"]');
	expect(cached).toHaveAttribute(
		"src",
		"https://app.test/_next/image?url=photo&w=128",
	);
	expect(cached).toHaveAttribute("loading", "eager");
	const sharp = within(preview).getByRole("img");
	expect(sharp).toHaveStyle({ opacity: "0" });
	fireEvent.load(sharp);
	expect(sharp).toHaveStyle({ opacity: "1" });
	expect(preview.querySelector('img[aria-hidden="true"]')).toBeNull();
});

it("retains the cached image if the sharper preview fails", async () => {
	render(<DiaryRecordPhotos photos={["https://utfs.io/f/1"]} />);
	fireEvent.load(screen.getByRole("img"));
	fireEvent.focus(screen.getByRole("button", { name: "Ziņojuma foto 1" }));
	await waitFor(() =>
		expect(
			document.querySelector('[data-slot="hover-card-content"]'),
		).not.toBeNull(),
	);
	const preview = document.querySelector(
		'[data-slot="hover-card-content"]',
	) as HTMLElement;
	fireEvent.error(within(preview).getByRole("img"));
	expect(within(preview).getByRole("img")).toHaveAttribute(
		"src",
		"https://utfs.io/f/1",
	);
	expect(within(preview).getAllByRole("img")).toHaveLength(1);
});
it("opens a row-specific preview without gallery navigation", () => {
	render(
		<DiaryRecordPhotos
			photos={["https://utfs.io/f/1", "https://utfs.io/f/2"]}
		/>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Ziņojuma foto 1" }));
	const dialog = screen.getByRole("dialog");
	expect(within(dialog).getByRole("img")).toHaveAttribute(
		"src",
		"https://utfs.io/f/1",
	);
	fireEvent.click(within(dialog).getByRole("button", { name: "Nākamais" }));
	expect(within(dialog).getByRole("img")).toHaveAttribute(
		"src",
		"https://utfs.io/f/2",
	);
});
