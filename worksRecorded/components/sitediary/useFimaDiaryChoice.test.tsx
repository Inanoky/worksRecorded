import { act, renderHook } from "@testing-library/react";
import { toast } from "sonner";
import type { FimaCollaboration } from "@/lib/fima/diary-collaboration";
import {
	getFimaDiaryCollaboration,
	saveFimaDiaryCollaboration,
} from "@/server/actions/fima-diary-collaboration";
import { useFimaDiaryChoice } from "./useFimaDiaryChoice";

jest.mock("@/server/actions/fima-diary-collaboration", () => ({
	getFimaDiaryCollaboration: jest.fn(),
	saveFimaDiaryCollaboration: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

const state: FimaCollaboration = {
	version: 0,
	status: null,
	materials: [],
	history: [],
};
const props = {
	field: "actType" as const,
	siteId: "site",
	recordId: "record",
	state,
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
beforeEach(() => jest.resetAllMocks());

it("shows linked types locally and saves rapid changes in order without preliminary reads", async () => {
	const first = deferred(),
		second = deferred();
	jest
		.mocked(saveFimaDiaryCollaboration)
		.mockReturnValueOnce(first.promise)
		.mockReturnValueOnce(second.promise);
	const { result } = renderHook(() =>
		useFimaDiaryChoice({ ...props, fallback: "contact_wire" }),
	);
	expect(result.current.value).toBe("contact_wire");
	act(() => result.current.selectValue("carrying_wire"));
	act(() => result.current.selectValue("dropper_wire"));
	expect(result.current.value).toBe("dropper_wire");
	expect(getFimaDiaryCollaboration).not.toHaveBeenCalled();
	expect(saveFimaDiaryCollaboration).toHaveBeenCalledTimes(1);
	await act(async () =>
		first.resolve({ ...state, version: 1, actType: "carrying_wire" }),
	);
	expect(result.current.value).toBe("dropper_wire");
	expect(saveFimaDiaryCollaboration).toHaveBeenLastCalledWith(
		expect.objectContaining({
			kind: "act_type",
			actType: "dropper_wire",
			expectedVersion: 1,
		}),
	);
	await act(async () =>
		second.resolve({ ...state, version: 2, actType: "dropper_wire" }),
	);
	expect(result.current.value).toBe("dropper_wire");
	expect(result.current.saving).toBe(false);
});

it("keeps an explicit clear selected even when an act supplies a fallback", async () => {
	jest
		.mocked(saveFimaDiaryCollaboration)
		.mockResolvedValue({ ...state, version: 1, actType: null });
	const { result } = renderHook(() =>
		useFimaDiaryChoice({ ...props, fallback: "contact_wire" }),
	);
	await act(async () => result.current.selectValue(null));
	expect(result.current.value).toBeNull();
	expect(props.onChange).toHaveBeenCalledWith(
		"record",
		expect.objectContaining({ actType: null }),
	);
});

it("recovers to the current saved choice after a conflict without overwriting it", async () => {
	jest
		.mocked(saveFimaDiaryCollaboration)
		.mockRejectedValue(Error("Ieraksts ir mainīts"));
	jest
		.mocked(getFimaDiaryCollaboration)
		.mockResolvedValue({ ...state, version: 2, actType: "consoles" });
	const { result } = renderHook(() => useFimaDiaryChoice(props));
	await act(async () => result.current.selectValue("contact_wire"));
	expect(result.current.value).toBe("consoles");
	expect(toast.error).toHaveBeenCalled();
	expect(result.current.recovering).toBe(false);
});
