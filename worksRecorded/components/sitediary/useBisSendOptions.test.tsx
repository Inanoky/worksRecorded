jest.mock("@/components/providers/ProjectLoadingProgressProvider", () => ({
	useProjectCacheScope: () => mockIdentity,
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { useBisSendOptions } from "./useBisSendOptions";

let mockIdentity = "user:org";
const mockFetch = jest.fn();
const response = (data: unknown[]) => ({
	ok: true,
	json: async () => ({ data }),
});

beforeEach(() => {
	mockIdentity = "user:org";
	mockFetch.mockReset();
	global.fetch = mockFetch;
	mockFetch.mockResolvedValue(response([]));
});

test("starts all option reads on project mount and uses ready fields while materials are pending", async () => {
	let finishMaterials!: (value: ReturnType<typeof response>) => void;
	mockFetch.mockImplementation((url: string) =>
		url.endsWith("materials")
			? new Promise((resolve) => {
					finishMaterials = resolve;
				})
			: Promise.resolve(response([{ id: "12", name: "m2" }])),
	);
	const { result, rerender } = renderHook(() =>
		useBisSendOptions("site", true),
	);
	await waitFor(() => expect(result.current.measurements.data).toHaveLength(1));
	expect(mockFetch).toHaveBeenCalledTimes(4);
	expect(result.current.materials.loading).toBe(true);
	expect(result.current.responsiblePeople.loading).toBe(false);
	rerender();
	expect(mockFetch).toHaveBeenCalledTimes(4);
	await act(async () =>
		finishMaterials(response([{ id: "material", availableQuantity: 10 }])),
	);
	expect(result.current.materials.data?.[0].id).toBe("material");
});

test("isolates projects and accounts, ignoring late responses", async () => {
	let finish!: (value: ReturnType<typeof response>) => void;
	mockFetch.mockImplementation((url: string) =>
		url.includes("/first/") && url.endsWith("materials")
			? new Promise((resolve) => {
					finish = resolve;
				})
			: Promise.resolve(response([{ id: "current" }])),
	);
	const { result, rerender } = renderHook(
		({ siteId }) => useBisSendOptions(siteId, true),
		{ initialProps: { siteId: "first" } },
	);
	await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));
	rerender({ siteId: "second" });
	expect(result.current.materials.data).toBeUndefined();
	await waitFor(() =>
		expect(result.current.materials.data?.[0].id).toBe("current"),
	);
	await act(async () => finish(response([{ id: "old" }])));
	expect(result.current.materials.data?.[0].id).toBe("current");
	mockIdentity = "another:org";
	rerender({ siteId: "second" });
	expect(result.current.materials.data).toBeUndefined();
	await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(12));
});

test("keeps ready options on a failed refresh and allows a retry", async () => {
	const { result } = renderHook(() => useBisSendOptions("site", true));
	await waitFor(() => expect(result.current.materials.data).toEqual([]));
	mockFetch.mockResolvedValueOnce({ ok: false });
	await act(() => result.current.materials.refresh());
	expect(result.current.materials.data).toEqual([]);
	expect(result.current.materials.error).toBeTruthy();
	mockFetch.mockResolvedValueOnce(response([{ id: "new" }]));
	await act(() => result.current.materials.refresh());
	expect(result.current.materials.data?.[0].id).toBe("new");
	expect(result.current.materials.error).toBeUndefined();
});

test("does not fetch when disabled and aborts pending reads when disabled", async () => {
	const { result, rerender } = renderHook(
		({ enabled }) => useBisSendOptions("site", enabled),
		{ initialProps: { enabled: false } },
	);
	expect(mockFetch).not.toHaveBeenCalled();
	mockFetch.mockImplementation(() => new Promise(() => {}));
	rerender({ enabled: true });
	await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));
	const signal = mockFetch.mock.calls[0][1].signal as AbortSignal;
	rerender({ enabled: false });
	expect(signal.aborted).toBe(true);
	expect(result.current.materials.loading).toBe(false);
	expect(result.current.materials.data).toBeUndefined();
});

test("finishes preloading with React strict effect replay", async () => {
	const { result } = renderHook(() => useBisSendOptions("site", true), {
		wrapper: ({ children }: { children: ReactNode }) => (
			<StrictMode>{children}</StrictMode>
		),
	});
	await waitFor(() =>
		expect(result.current.responsiblePeople.data).toEqual([]),
	);
	expect(result.current.materials.loading).toBe(false);
});
