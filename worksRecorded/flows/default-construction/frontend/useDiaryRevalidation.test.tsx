import { act, renderHook } from "@testing-library/react";
import { useDiaryRevalidation } from "./useDiaryRevalidation";

beforeEach(() => {
	jest.useFakeTimers();
	jest.setSystemTime(1_000_000);
});
afterEach(() => jest.useRealTimers());

function setup(overrides = {}) {
	const lastLoaded = { current: Date.now() };
	const refresh = jest.fn(async () => {
		lastLoaded.current = Date.now();
	});
	const props = {
		enabled: true,
		active: true,
		blocked: false,
		lastLoaded,
		refresh,
		...overrides,
	};
	const hook = renderHook((options) => useDiaryRevalidation(options), {
		initialProps: props,
	});
	return { ...hook, props, refresh, lastLoaded };
}

it("does not refetch fresh data on rapid return and checks stale data in the background", async () => {
	const { rerender, props, refresh } = setup();
	rerender({ ...props, active: false });
	rerender(props);
	expect(refresh).not.toHaveBeenCalled();
	rerender({ ...props, active: false });
	await act(async () => jest.advanceTimersByTime(61_000));
	expect(refresh).not.toHaveBeenCalled();
	await act(async () => rerender(props));
	expect(refresh).toHaveBeenCalledTimes(1);
});

it("refreshes while visible but not while editing or performing a save", async () => {
	const { rerender, props, refresh } = setup();
	await act(async () => jest.advanceTimersByTime(60_000));
	expect(refresh).toHaveBeenCalledTimes(1);
	rerender({ ...props, blocked: true });
	await act(async () => jest.advanceTimersByTime(120_000));
	expect(refresh).toHaveBeenCalledTimes(1);
	await act(async () => rerender(props));
	expect(refresh).toHaveBeenCalledTimes(2);
});

it("does not poll other organizations or an uninitialized diary", async () => {
	const { refresh } = setup({ enabled: false });
	await act(async () => jest.advanceTimersByTime(120_000));
	expect(refresh).not.toHaveBeenCalled();
});

it("does not overlap refreshes and removes listeners on unmount", async () => {
	let finish!: () => void;
	const refresh = jest.fn(
		() =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	);
	const { unmount } = setup({ refresh, lastLoaded: { current: 0 } });
	await act(async () => {
		window.dispatchEvent(new Event("focus"));
		jest.advanceTimersByTime(120_000);
	});
	expect(refresh).toHaveBeenCalledTimes(1);
	await act(async () => finish());
	unmount();
	await act(async () => {
		window.dispatchEvent(new Event("focus"));
		jest.advanceTimersByTime(120_000);
	});
	expect(refresh).toHaveBeenCalledTimes(1);
});

it("reports background failures without removing cached data and recovers on retry", async () => {
	const refresh = jest
		.fn()
		.mockRejectedValueOnce(new Error("Offline"))
		.mockResolvedValue(undefined);
	const { result } = setup({ refresh, lastLoaded: { current: 0 } });
	await act(async () => {});
	expect(result.current).toBe(true);
	await act(async () => window.dispatchEvent(new Event("focus")));
	expect(refresh).toHaveBeenCalledTimes(1);
	await act(async () => jest.advanceTimersByTime(60_000));
	expect(result.current).toBe(false);
});

it("pauses requests while the browser tab is hidden and checks again on visibility", async () => {
	const visibility = jest
		.spyOn(document, "visibilityState", "get")
		.mockReturnValue("hidden");
	const { refresh } = setup({ lastLoaded: { current: 0 } });
	await act(async () => jest.advanceTimersByTime(120_000));
	expect(refresh).not.toHaveBeenCalled();
	visibility.mockReturnValue("visible");
	await act(async () => document.dispatchEvent(new Event("visibilitychange")));
	expect(refresh).toHaveBeenCalledTimes(1);
	visibility.mockRestore();
});
