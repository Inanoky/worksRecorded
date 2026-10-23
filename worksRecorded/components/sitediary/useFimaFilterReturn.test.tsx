import { renderHook } from "@testing-library/react";
import { useFimaFilterReturn } from "./useFimaFilterReturn";

beforeEach(() => {
	jest.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

it("restores the page and scroll from before filtering across multiple filter changes", () => {
	const table = document.createElement("div");
	table.dataset.slot = "table-container";
	table.scrollLeft = 360;
	table.scrollTop = 120;
	const container = document.createElement("div");
	container.append(table);
	const ref = { current: container };
	const { result } = renderHook(() => useFimaFilterReturn("project", ref));
	jest.replaceProperty(window, "scrollX", 20);
	jest.replaceProperty(window, "scrollY", 640);
	expect(result.current.change(false, true, 3)).toBe(1);
	table.scrollLeft = 0;
	table.scrollTop = 0;
	expect(result.current.change(true, true, 2)).toBe(1);
	expect(result.current.change(true, false, 1)).toBe(3);
	result.current.restore();
	expect(table.scrollLeft).toBe(360);
	expect(table.scrollTop).toBe(120);
	expect(window.scrollTo).toHaveBeenCalledWith({
		left: 20,
		top: 640,
		behavior: "instant",
	});
	expect(result.current.change(false, true, 2)).toBe(1);
	expect(result.current.change(true, false, 1)).toBe(2);
});

it("retains the return position until the restored results are successfully displayed", () => {
	const { result } = renderHook(() =>
		useFimaFilterReturn("project", { current: null }),
	);
	result.current.change(false, true, 4);
	expect(result.current.change(true, false, 1)).toBe(4);
	expect(window.scrollTo).not.toHaveBeenCalled();
	expect(result.current.change(true, false, 1)).toBe(4);
	result.current.restore();
	result.current.restore();
	expect(window.scrollTo).toHaveBeenCalledTimes(1);
});

it("keeps the current page when filters were never applied in this view", () => {
	const { result } = renderHook(() =>
		useFimaFilterReturn("project", { current: null }),
	);
	expect(result.current.change(false, false, 3)).toBe(3);
	expect(result.current.change(true, false, 2)).toBe(2);
	result.current.restore();
	expect(window.scrollTo).not.toHaveBeenCalled();
});

it("does not reuse a previous project's return position", () => {
	const ref = { current: null };
	const { result, rerender } = renderHook(
		({ scope }) => useFimaFilterReturn(scope, ref),
		{
			initialProps: { scope: "first" },
		},
	);
	result.current.change(false, true, 4);
	result.current.change(true, false, 1);
	rerender({ scope: "second" });
	result.current.restore();
	expect(window.scrollTo).not.toHaveBeenCalled();
	expect(result.current.change(true, false, 2)).toBe(2);
});
