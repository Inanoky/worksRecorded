import type { VisualPlan } from "./planning-model";
import { publishPlanningShare } from "./planning-share-client";

const token = `11111111-1111-4111-8111-111111111111.${"a".repeat(64)}`;
const plan = { id: "plan", version: 2 } as VisualPlan;
const images = [{ page: 1, blob: new Blob(["png"], { type: "image/png" }) }];
const bitmap = { width: 1600, height: 1800, close: jest.fn() };
const originalFetch = globalThis.fetch;
const originalBitmap = globalThis.createImageBitmap;
beforeEach(() => {
	jest.clearAllMocks();
	globalThis.createImageBitmap = jest.fn().mockResolvedValue(bitmap);
	globalThis.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: async () => ({ token, path: "https://evil.com/not-used" }),
	});
	jest
		.spyOn(HTMLCanvasElement.prototype, "getContext")
		.mockReturnValue({ fillRect: jest.fn(), drawImage: jest.fn() } as never);
	jest
		.spyOn(HTMLCanvasElement.prototype, "toBlob")
		.mockImplementation((callback) =>
			callback(new Blob(["jpeg"], { type: "image/jpeg" })),
		);
});
afterEach(() => {
	jest.restoreAllMocks();
	globalThis.fetch = originalFetch;
	globalThis.createImageBitmap = originalBitmap;
});
it("compresses images and publishes through the authenticated site route with a canonical WorksRecorded link", async () => {
	const controller = new AbortController();
	expect(
		await publishPlanningShare("site", plan, images, controller.signal),
	).toEqual({
		token,
		url: `https://www.worksrecorded.com/shared/work/${token}`,
		version: 2,
	});
	expect(fetch).toHaveBeenCalledWith(
		"/api/sites/site/visual/planning-share",
		expect.objectContaining({ method: "POST", signal: controller.signal }),
	);
	const form = jest.mocked(fetch).mock.calls[0][1]?.body as FormData;
	expect(form.get("version")).toBe("2");
	expect(form.get("pages")).toBe("[1]");
	expect(form.getAll("images")[0]).toMatchObject({ type: "image/jpeg" });
	expect(bitmap.close).toHaveBeenCalled();
});
it("reduces quality before uploading and never publishes an oversized image", async () => {
	jest
		.mocked(HTMLCanvasElement.prototype.toBlob)
		.mockImplementation((callback) =>
			callback(new Blob([new Uint8Array(300001)], { type: "image/jpeg" })),
		);
	await expect(
		publishPlanningShare("site", plan, images, new AbortController().signal),
	).rejects.toThrow("Image too large");
	expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledTimes(12);
	expect(fetch).not.toHaveBeenCalled();
	expect(bitmap.close).toHaveBeenCalled();
});
it("does not upload cancelled preparation and rejects malformed share responses", async () => {
	const controller = new AbortController();
	controller.abort();
	await expect(
		publishPlanningShare("site", plan, images, controller.signal),
	).rejects.toThrow();
	expect(fetch).not.toHaveBeenCalled();
	expect(bitmap.close).toHaveBeenCalled();
	jest.mocked(fetch).mockResolvedValue({
		ok: true,
		json: async () => ({ token: "invalid" }),
	} as Response);
	await expect(
		publishPlanningShare("site", plan, images, new AbortController().signal),
	).rejects.toThrow();
});
