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

it("zooms up to 400 percent, zooms out, and resets to fit without another image URL", () => {
	render(<DiaryRecordPhotos photos={["https://utfs.io/f/1"]} language="en" />);
	fireEvent.click(screen.getByRole("button", { name: "Report photo 1" }));
	const dialog = within(screen.getByRole("dialog"));
	const zoomIn = dialog.getByRole("button", { name: "Zoom in" });
	const zoomOut = dialog.getByRole("button", { name: "Zoom out" });
	expect(zoomOut).toBeDisabled();
	for (let index = 0; index < 6; index++) fireEvent.click(zoomIn);
	expect(dialog.getByLabelText("Zoom level")).toHaveTextContent("400%");
	expect(zoomIn).toBeDisabled();
	expect(dialog.getByRole("img").parentElement).toHaveStyle({
		width: "400%",
		height: "400%",
	});
	expect(dialog.getByRole("img")).toHaveAttribute("src", "https://utfs.io/f/1");
	fireEvent.click(zoomOut);
	expect(dialog.getByLabelText("Zoom level")).toHaveTextContent("350%");
	fireEvent.click(dialog.getByRole("button", { name: "Fit image" }));
	expect(dialog.getByLabelText("Zoom level")).toHaveTextContent("100%");
	expect(zoomOut).toBeDisabled();
});

it("resets zoom when navigating to another photo or reopening the viewer", () => {
	render(
		<DiaryRecordPhotos
			photos={["https://utfs.io/f/1", "https://utfs.io/f/2"]}
		/>,
	);
	const open = screen.getByRole("button", { name: "Ziņojuma foto 1" });
	fireEvent.click(open);
	fireEvent.click(screen.getByRole("button", { name: "Pietuvināt" }));
	expect(screen.getByLabelText("Tālummaiņa")).toHaveTextContent("150%");
	fireEvent.click(screen.getByRole("button", { name: "Nākamais" }));
	expect(screen.getByLabelText("Tālummaiņa")).toHaveTextContent("100%");
	fireEvent.click(screen.getByRole("button", { name: "Pietuvināt" }));
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	fireEvent.click(open);
	expect(screen.getByLabelText("Tālummaiņa")).toHaveTextContent("100%");
});

it("pans an enlarged photo by dragging and resets its position", () => {
	render(<DiaryRecordPhotos photos={["https://utfs.io/f/1"]} language="en" />);
	fireEvent.click(screen.getByRole("button", { name: "Report photo 1" }));
	fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
	const viewport = screen.getByRole("region", { name: "Photo zoom view" });
	const pointer = (type: string, x: number, y: number) => {
		const event = new Event(type, { bubbles: true });
		Object.assign(event, {
			pointerType: "mouse",
			button: 0,
			pointerId: 1,
			clientX: x,
			clientY: y,
		});
		fireEvent(viewport, event);
	};
	pointer("pointerdown", 100, 100);
	pointer("pointermove", 60, 50);
	expect(viewport.scrollLeft).toBe(40);
	expect(viewport.scrollTop).toBe(50);
	pointer("pointerup", 60, 50);
	pointer("pointermove", 10, 10);
	expect(viewport.scrollLeft).toBe(40);
	fireEvent.click(screen.getByRole("button", { name: "Fit image" }));
	expect(viewport.scrollLeft).toBe(0);
	expect(viewport.scrollTop).toBe(0);
});

it("zooms with the wheel only over the photo and prevents scrolling within its limits", () => {
	render(<DiaryRecordPhotos photos={["https://utfs.io/f/1"]} language="en" />);
	fireEvent.click(screen.getByRole("button", { name: "Report photo 1" }));
	const viewport = screen.getByRole("region", { name: "Photo zoom view" });
	const wheel = (deltaY: number) => {
		const event = new WheelEvent("wheel", {
			deltaY,
			bubbles: true,
			cancelable: true,
		});
		fireEvent(viewport, event);
		return event;
	};
	expect(wheel(-100).defaultPrevented).toBe(true);
	expect(screen.getByLabelText("Zoom level")).toHaveTextContent("125%");
	wheel(100);
	expect(screen.getByLabelText("Zoom level")).toHaveTextContent("100%");
	expect(wheel(100).defaultPrevented).toBe(true);
	for (let index = 0; index < 20; index++) wheel(-100);
	expect(screen.getByLabelText("Zoom level")).toHaveTextContent("400%");
	fireEvent.wheel(screen.getByRole("dialog"), { deltaY: 100 });
	expect(screen.getByLabelText("Zoom level")).toHaveTextContent("400%");
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
	expect(wheel(-100).defaultPrevented).toBe(false);
});
