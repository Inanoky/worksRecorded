import { act, render, screen } from "@testing-library/react";
import { AllProjectsPhotoPreloader } from "./AllProjectsPhotoPreloader";
import {
	type DiaryImageProgress,
	preloadDiaryImages,
} from "./preloadDiaryImages";

jest.mock("./preloadDiaryImages", () => ({ preloadDiaryImages: jest.fn() }));
const preload = jest.mocked(preloadDiaryImages);
let finish: (progress: DiaryImageProgress) => void;
beforeEach(() => {
	preload.mockReset();
	preload.mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
});

it("waits for preloading and preserves the cache across pagination", async () => {
	const urls = ["https://utfs.io/f/a", "https://utfs.io/f/b"];
	const view = render(
		<AllProjectsPhotoPreloader urls={urls} language="lv">
			<p>Page 1</p>
		</AllProjectsPhotoPreloader>,
	);
	expect(screen.queryByText("Page 1")).not.toBeInTheDocument();
	expect(screen.getByRole("status")).toHaveTextContent("Ielādē projektu foto");
	expect(preload).toHaveBeenCalledWith(urls, expect.any(Object));
	await act(async () => {
		finish({ total: 2, completed: 2, failed: 0 });
	});
	expect(screen.getByText("Page 1")).toBeInTheDocument();
	view.rerender(
		<AllProjectsPhotoPreloader urls={[...urls]} language="lv">
			<p>Page 2</p>
		</AllProjectsPhotoPreloader>,
	);
	expect(screen.getByText("Page 2")).toBeInTheDocument();
	expect(preload).toHaveBeenCalledTimes(1);
});

it("shows records with a warning after photo failures", async () => {
	render(
		<AllProjectsPhotoPreloader urls={["https://utfs.io/f/a"]} language="en">
			<p>Records</p>
		</AllProjectsPhotoPreloader>,
	);
	await act(async () => {
		finish({ total: 1, completed: 1, failed: 1 });
	});
	expect(screen.getByText("Records")).toBeInTheDocument();
	expect(screen.getByRole("status")).toHaveTextContent(
		"Some photos could not be loaded",
	);
});

it("cancels outdated preloads when filters change and when leaving", async () => {
	const view = render(
		<AllProjectsPhotoPreloader urls={["https://utfs.io/f/a"]} language="en">
			<p>Old</p>
		</AllProjectsPhotoPreloader>,
	);
	const firstFinish = finish;
	const firstOptions = preload.mock.calls[0][1];
	view.rerender(
		<AllProjectsPhotoPreloader urls={["https://utfs.io/f/b"]} language="en">
			<p>New</p>
		</AllProjectsPhotoPreloader>,
	);
	expect(firstOptions.signal.aborted).toBe(true);
	const secondOptions = preload.mock.calls[1][1];
	expect(secondOptions.cache).toBe(firstOptions.cache);
	await act(async () => {
		firstFinish({ total: 1, completed: 1, failed: 0 });
	});
	expect(screen.queryByText("New")).not.toBeInTheDocument();
	view.unmount();
	expect(secondOptions.signal.aborted).toBe(true);
});

it("does not block records with no linked photos", () => {
	render(
		<AllProjectsPhotoPreloader urls={[]} language="en">
			<p>Records</p>
		</AllProjectsPhotoPreloader>,
	);
	expect(screen.getByText("Records")).toBeInTheDocument();
});
