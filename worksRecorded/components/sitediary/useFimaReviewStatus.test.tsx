import { act, renderHook } from "@testing-library/react";
import { toast } from "sonner";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import {
	getFimaDiaryCollaboration,
	saveFimaDiaryCollaboration,
} from "@/server/actions/fima-diary-collaboration";
import { useFimaReviewStatus } from "./useFimaReviewStatus";

jest.mock("@/server/actions/fima-diary-collaboration", () => ({
	getFimaDiaryCollaboration: jest.fn(),
	saveFimaDiaryCollaboration: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
const initial: FimaCollaboration = {
	version: 0,
	status: null,
	materials: [],
	history: [],
};
const props = {
	siteId: "site",
	recordId: "record",
	state: initial,
	onChange: jest.fn(),
};
function deferred() {
	let resolve!: (value: FimaCollaboration) => void;
	let reject!: (reason: Error) => void;
	const promise = new Promise<FimaCollaboration>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(getFimaDiaryCollaboration).mockResolvedValue(initial);
});
it.each([
	"needs_changes",
	"coordinate_with_fima",
	"updated",
	"ai_prepared",
	"approved",
] as const)(
	"changes %s immediately before the background save completes, without a preliminary read",
	async (status) => {
		const save = deferred();
		jest.mocked(saveFimaDiaryCollaboration).mockReturnValue(save.promise);
		const { result } = renderHook(() => useFimaReviewStatus(props));
		act(() => result.current.selectStatus(status));
		expect(result.current.status).toBe(status);
		expect(result.current.saving).toBe(true);
		expect(getFimaDiaryCollaboration).not.toHaveBeenCalled();
		expect(props.onChange).not.toHaveBeenCalled();
		await act(async () => save.resolve({ ...initial, version: 1, status }));
		expect(result.current.saving).toBe(false);
		expect(result.current.status).toBe(status);
		expect(props.onChange).toHaveBeenCalledWith(
			"record",
			expect.objectContaining({ version: 1, status }),
		);
	},
);
it("keeps the latest selection visible while rapid changes save sequentially with the correct versions", async () => {
	const first = deferred(),
		second = deferred();
	jest
		.mocked(saveFimaDiaryCollaboration)
		.mockReturnValueOnce(first.promise)
		.mockReturnValueOnce(second.promise);
	const { result } = renderHook(() => useFimaReviewStatus(props));
	act(() => {
		result.current.selectStatus("needs_changes");
		result.current.selectStatus("ready_for_approval");
	});
	expect(result.current.status).toBe("ready_for_approval");
	expect(saveFimaDiaryCollaboration).toHaveBeenCalledTimes(1);
	await act(async () =>
		first.resolve({ ...initial, version: 1, status: "needs_changes" }),
	);
	expect(result.current.status).toBe("ready_for_approval");
	expect(result.current.recovering).toBe(false);
	expect(saveFimaDiaryCollaboration).toHaveBeenNthCalledWith(
		2,
		expect.objectContaining({
			expectedVersion: 1,
			status: "ready_for_approval",
		}),
	);
	await act(async () =>
		second.resolve({ ...initial, version: 2, status: "ready_for_approval" }),
	);
	expect(result.current.saving).toBe(false);
	expect(result.current.status).toBe("ready_for_approval");
});
it("restores the authoritative saved badge on failure instead of leaving an unsaved selection", async () => {
	const save = deferred();
	const stored = { ...initial, version: 3, status: "do_not_create" as const };
	jest.mocked(saveFimaDiaryCollaboration).mockReturnValue(save.promise);
	jest.mocked(getFimaDiaryCollaboration).mockResolvedValue(stored);
	const { result } = renderHook(() => useFimaReviewStatus(props));
	act(() => result.current.selectStatus("ready_for_approval"));
	await act(async () => save.reject(new Error("Nav savienojuma")));
	expect(result.current.status).toBe("do_not_create");
	expect(result.current.saving).toBe(false);
	expect(toast.error).toHaveBeenCalledWith("Nav savienojuma");
});
it("supports clearing a badge while a different selection is still saving", async () => {
	const first = deferred(),
		second = deferred();
	jest
		.mocked(saveFimaDiaryCollaboration)
		.mockReturnValueOnce(first.promise)
		.mockReturnValueOnce(second.promise);
	const { result } = renderHook(() => useFimaReviewStatus(props));
	act(() => {
		result.current.selectStatus("needs_changes");
		result.current.selectStatus(null);
		result.current.selectStatus(null);
	});
	expect(result.current.status).toBeNull();
	await act(async () =>
		first.resolve({ ...initial, version: 1, status: "needs_changes" }),
	);
	expect(saveFimaDiaryCollaboration).toHaveBeenCalledTimes(2);
	expect(saveFimaDiaryCollaboration).toHaveBeenLastCalledWith(
		expect.objectContaining({ status: null, expectedVersion: 1 }),
	);
	await act(async () =>
		second.resolve({ ...initial, version: 2, status: null }),
	);
	expect(result.current.status).toBeNull();
});
it("does not lose an in-flight selection when an older table refresh arrives", async () => {
	const save = deferred();
	jest.mocked(saveFimaDiaryCollaboration).mockReturnValue(save.promise);
	const { result, rerender } = renderHook(
		({ state }) => useFimaReviewStatus({ ...props, state }),
		{ initialProps: { state: initial } },
	);
	act(() => result.current.selectStatus("needs_changes"));
	rerender({ state: { ...initial } });
	expect(result.current.status).toBe("needs_changes");
	await act(async () =>
		save.resolve({ ...initial, version: 1, status: "needs_changes" }),
	);
	rerender({ state: { ...initial } });
	expect(result.current.status).toBe("needs_changes");
});
