import { act, renderHook } from "@testing-library/react";
import { useVisualAutoSync } from "./useVisualAutoSync";

beforeEach(() => {
	jest.useFakeTimers();
	jest.setSystemTime(1_000_000);
});
afterEach(() => {
	jest.useRealTimers();
	jest.restoreAllMocks();
});

function setup() {
	const sync = jest.fn(async () => {});
	const props = { active: true, scope: "site:drawing", blocked: false, sync };
	return {
		...renderHook((value) => useVisualAutoSync(value), { initialProps: props }),
		props,
		sync,
	};
}

it("checks on open, periodically and on returning without overlapping focus events", async () => {
	const { sync, rerender, props } = setup();
	await act(async () => jest.advanceTimersByTime(1000));
	expect(sync).toHaveBeenCalledTimes(1);
	await act(async () => window.dispatchEvent(new Event("focus")));
	expect(sync).toHaveBeenCalledTimes(1);
	await act(async () => jest.advanceTimersByTime(29_000));
	expect(sync).toHaveBeenCalledTimes(2);
	rerender({ ...props, active: false });
	await act(async () => jest.advanceTimersByTime(90_000));
	expect(sync).toHaveBeenCalledTimes(2);
	rerender(props);
	await act(async () => jest.advanceTimersByTime(1000));
	expect(sync).toHaveBeenCalledTimes(3);
});

it("pauses in hidden browser tabs, during editing and before a drawing is loaded", async () => {
	const { sync, rerender, props } = setup();
	const visible = jest
		.spyOn(document, "visibilityState", "get")
		.mockReturnValue("hidden");
	await act(async () => jest.advanceTimersByTime(30_000));
	expect(sync).not.toHaveBeenCalled();
	visible.mockReturnValue("visible");
	rerender({ ...props, blocked: true });
	await act(async () => jest.advanceTimersByTime(30_000));
	expect(sync).not.toHaveBeenCalled();
	rerender(props);
	await act(async () => document.dispatchEvent(new Event("visibilitychange")));
	expect(sync).toHaveBeenCalledTimes(1);
	rerender({ ...props, scope: "" });
	await act(async () => jest.advanceTimersByTime(60_000));
	expect(sync).toHaveBeenCalledTimes(1);
});

it("uses the latest callback, prevents concurrent updates and cleans up on unmount", async () => {
	let finish!: () => void;
	const sync = jest.fn(
		() =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	);
	const props = { active: true, scope: "drawing", blocked: false, sync };
	const { unmount } = renderHook(() => useVisualAutoSync(props));
	await act(async () => jest.advanceTimersByTime(1000));
	await act(async () => {
		jest.advanceTimersByTime(60_000);
		window.dispatchEvent(new Event("focus"));
	});
	expect(sync).toHaveBeenCalledTimes(1);
	await act(async () => finish());
	unmount();
	await act(async () => {
		jest.advanceTimersByTime(60_000);
		window.dispatchEvent(new Event("focus"));
	});
	expect(sync).toHaveBeenCalledTimes(1);
});
