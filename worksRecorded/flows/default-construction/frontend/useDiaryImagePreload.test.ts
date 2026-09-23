import { renderHook, waitFor } from "@testing-library/react";
import { preloadDiaryImages } from "./preloadDiaryImages";
import { useDiaryImagePreload } from "./useDiaryImagePreload";

jest.mock("./preloadDiaryImages", () => ({ preloadDiaryImages: jest.fn() }));
const preload = jest.mocked(preloadDiaryImages);
let downloads: string[];
beforeEach(() => {
	downloads = [];
	preload.mockReset();
	preload.mockImplementation(async (values, options) => {
		const urls = values as string[];
		for (const url of urls) {
			if (options.cache.has(url)) continue;
			downloads.push(url);
			options.cache.set(url, {} as HTMLImageElement);
		}
		return { total: urls.length, completed: urls.length, failed: 0 };
	});
});

it("retains earlier pages in cache and fetches later pages only when requested", async () => {
	const { result, rerender } = renderHook(
		({ urls }) => useDiaryImagePreload(urls, "site"),
		{
			initialProps: { urls: ["page-1", "page-2"] },
		},
	);
	await waitFor(() => expect(result.current.loading).toBe(false));
	expect(downloads).toEqual(["page-1", "page-2"]);
	rerender({ urls: ["page-3"] });
	await waitFor(() => expect(result.current.loading).toBe(false));
	expect(downloads).toEqual(["page-1", "page-2", "page-3"]);
	rerender({ urls: ["page-1", "page-2"] });
	await waitFor(() => expect(result.current.loading).toBe(false));
	expect(downloads).toEqual(["page-1", "page-2", "page-3"]);
});

it("waits for the current site's snapshot and clears cache when the site changes", async () => {
	const { result, rerender } = renderHook(
		({ scope, enabled }) => useDiaryImagePreload(["photo"], scope, enabled),
		{
			initialProps: { scope: "first-site", enabled: false },
		},
	);
	expect(preload).not.toHaveBeenCalled();
	rerender({ scope: "first-site", enabled: true });
	await waitFor(() => expect(result.current.loading).toBe(false));
	rerender({ scope: "second-site", enabled: true });
	await waitFor(() => expect(result.current.loading).toBe(false));
	expect(downloads).toEqual(["photo", "photo"]);
});
