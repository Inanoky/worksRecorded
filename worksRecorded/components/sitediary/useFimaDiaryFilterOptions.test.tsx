import { act, renderHook, waitFor } from "@testing-library/react";
import { getFimaDiaryFilterOptions } from "@/server/actions/fima-diary-filter-options";
import { useFimaDiaryFilterOptions } from "./useFimaDiaryFilterOptions";

jest.mock("@/server/actions/fima-diary-filter-options", () => ({
	getFimaDiaryFilterOptions: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
beforeEach(() => jest.resetAllMocks());

it("keeps full-project options across page and filter changes and reloads after option edits", async () => {
	const options = {
		works: ["Page 1 work", "Page 3 work"],
		locations: ["Floor 9"],
	};
	jest.mocked(getFimaDiaryFilterOptions).mockResolvedValue(options);
	const { result, rerender } = renderHook(
		({ revision }) => useFimaDiaryFilterOptions("project", true, revision),
		{ initialProps: { revision: 0 } },
	);
	await waitFor(() => expect(result.current).toEqual(options));
	rerender({ revision: 0 });
	expect(getFimaDiaryFilterOptions).toHaveBeenCalledTimes(1);
	const updated = {
		works: [...options.works, "New work"],
		locations: options.locations,
	};
	jest.mocked(getFimaDiaryFilterOptions).mockResolvedValue(updated);
	rerender({ revision: 1 });
	await waitFor(() => expect(result.current).toEqual(updated));
});

it("ignores a previous project's late response", async () => {
	let finish!: (value: { works: string[]; locations: string[] }) => void;
	jest
		.mocked(getFimaDiaryFilterOptions)
		.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		)
		.mockResolvedValueOnce({ works: ["Current project work"], locations: [] });
	const { result, rerender } = renderHook(
		({ siteId }) => useFimaDiaryFilterOptions(siteId, true, 0),
		{ initialProps: { siteId: "old-project" } },
	);
	rerender({ siteId: "current-project" });
	await waitFor(() =>
		expect(result.current?.works).toEqual(["Current project work"]),
	);
	await act(async () => finish({ works: ["Old project work"], locations: [] }));
	expect(result.current?.works).toEqual(["Current project work"]);
});

it("does not load options for other flows", () => {
	const { result } = renderHook(() =>
		useFimaDiaryFilterOptions("project", false, 0),
	);
	expect(result.current).toBeNull();
	expect(getFimaDiaryFilterOptions).not.toHaveBeenCalled();
});

it("derives options from every cached row without a server call, including after edits", () => {
	const { result, rerender } = renderHook(
		({ rows }) => useFimaDiaryFilterOptions("project", true, 0, rows),
		{
			initialProps: {
				rows: [
					{ Works: "First page", Location: "21-18" },
					{ Works: "Later page", Location: "21-20" },
				],
			},
		},
	);
	expect(result.current?.works).toEqual(["First page", "Later page"]);
	rerender({ rows: [{ Works: "Edited", Location: "21-18" }] });
	expect(result.current?.works).toEqual(["Edited"]);
	expect(getFimaDiaryFilterOptions).not.toHaveBeenCalled();
});
