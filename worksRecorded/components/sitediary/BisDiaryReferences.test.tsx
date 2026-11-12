jest.mock("@/components/providers/ProjectLoadingProgressProvider", () => ({
	useProjectCacheScope: () => "user:org",
}));
jest.mock("@/server/actions/bis-diary-references", () => ({
	loadBisDiaryReferenceOptions: jest.fn(),
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import { loadBisDiaryReferenceOptions } from "@/server/actions/bis-diary-references";
import { useBisDiaryReferences } from "./BisDiaryReferences";

beforeEach(() => {
	jest.clearAllMocks();
	global.fetch = jest.fn(async (url: string | URL | Request) => {
		const parsed = new URL(String(url), "https://app.example");
		const siteId = parsed.pathname.split("/")[3];
		const result = await loadBisDiaryReferenceOptions(
			siteId,
			parsed.searchParams.get("refresh") === "1",
		);
		return { ok: result.ok, json: async () => result } as Response;
	});
	jest
		.mocked(loadBisDiaryReferenceOptions)
		.mockImplementation(async (siteId) => ({
			ok: true,
			data: { scope: siteId, drawings: [], estimates: [] },
		}));
});

test("preloads on project mount and preserves the list across renders", async () => {
	const { result, rerender } = renderHook(() =>
		useBisDiaryReferences("project", true),
	);
	await waitFor(() => expect(result.current.data?.scope).toBe("project"));
	rerender();
	expect(loadBisDiaryReferenceOptions).toHaveBeenCalledTimes(1);
	await act(() => result.current.refresh());
	expect(loadBisDiaryReferenceOptions).toHaveBeenLastCalledWith(
		"project",
		true,
	);
});

test("does not fetch for other flows or expose a previous project's options", async () => {
	const { result, rerender } = renderHook(
		({ siteId, enabled }) => useBisDiaryReferences(siteId, enabled),
		{ initialProps: { siteId: "first", enabled: false } },
	);
	expect(loadBisDiaryReferenceOptions).not.toHaveBeenCalled();
	rerender({ siteId: "first", enabled: true });
	await waitFor(() => expect(result.current.data?.scope).toBe("first"));
	let resolve!: (
		value: Awaited<ReturnType<typeof loadBisDiaryReferenceOptions>>,
	) => void;
	jest.mocked(loadBisDiaryReferenceOptions).mockReturnValueOnce(
		new Promise((done) => {
			resolve = done;
		}),
	);
	rerender({ siteId: "second", enabled: true });
	expect(result.current.data).toBeUndefined();
	await act(async () =>
		resolve({
			ok: true,
			data: { scope: "second", drawings: [], estimates: [] },
		}),
	);
	expect(result.current.data?.scope).toBe("second");
});
