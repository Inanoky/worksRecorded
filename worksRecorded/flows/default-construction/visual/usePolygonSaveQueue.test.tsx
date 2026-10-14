import { act, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { saveVisualPolygonPatch as saveVisualPolygon } from "./actions";
import type { PolygonEdit } from "./polygon-edit";
import { usePolygonSaveQueue } from "./usePolygonSaveQueue";

jest.mock("./actions", () => ({ saveVisualPolygonPatch: jest.fn() }));
const edit: PolygonEdit = {
	markId: "mark",
	expectedPolygon: [
		{ x: 0.1, y: 0.1 },
		{ x: 0.4, y: 0.1 },
		{ x: 0.4, y: 0.4 },
	],
	polygon: [
		{ x: 0.15, y: 0.1 },
		{ x: 0.4, y: 0.1 },
		{ x: 0.4, y: 0.4 },
	],
	mutationId: "11111111-1111-4111-8111-111111111111",
};
const stored = JSON.stringify({
	version: 1,
	items: [{ drawingId: "drawing", edit }],
});
const key = "limeni.visual.polygon-saves:v1:user:site";
beforeEach(() => {
	jest.clearAllMocks();
	sessionStorage.clear();
});
afterEach(() => {
	jest.restoreAllMocks();
	sessionStorage.clear();
});

it("restores failed drafts only for the matching user/project and waits for an explicit retry", async () => {
	sessionStorage.setItem(key, stored);
	const onSaved = jest.fn();
	const view = renderHook(
		({ userId }) => usePolygonSaveQueue("site", userId, onSaved),
		{ initialProps: { userId: "user" } },
	);
	expect(view.result.current.state.items).toHaveLength(1);
	expect(view.result.current.state.items[0].status).toBe("failed");
	expect(saveVisualPolygon).not.toHaveBeenCalled();
	view.rerender({ userId: "other-user" });
	expect(view.result.current.state.items).toHaveLength(0);
	expect(JSON.parse(sessionStorage.getItem(key) ?? "null")).toEqual(
		JSON.parse(stored),
	);
	view.rerender({ userId: "user" });
	jest.mocked(saveVisualPolygon).mockResolvedValue({
		ok: true,
		result: {
			drawingId: "drawing",
			markId: "mark",
			polygon: edit.polygon,
			editedAt: "2026-10-13",
			editedBy: "user",
			mutationId: edit.mutationId ?? null,
		},
	});
	act(() => view.result.current.queue.retry("drawing", "mark"));
	await waitFor(() => expect(view.result.current.state.items).toHaveLength(0));
	expect(saveVisualPolygon).toHaveBeenCalledWith("site", "drawing", edit);
	expect(sessionStorage.getItem(key)).toBeNull();
});

it("warns before reload or leaving the project while pending edits exist and cleans up listeners", () => {
	sessionStorage.setItem(key, stored);
	const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
	const onSaved = jest.fn();
	const view = renderHook(() => usePolygonSaveQueue("site", "user", onSaved));
	const unload = new Event("beforeunload", { cancelable: true });
	window.dispatchEvent(unload);
	expect(unload.defaultPrevented).toBe(true);
	const link = document.createElement("a");
	link.href = "/dashboard";
	document.body.append(link);
	fireEvent.click(link);
	expect(confirm).toHaveBeenCalledTimes(1);
	view.unmount();
	const clean = new Event("beforeunload", { cancelable: true });
	window.dispatchEvent(clean);
	expect(clean.defaultPrevented).toBe(false);
	link.remove();
});
