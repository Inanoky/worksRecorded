import { isShareImageUrl } from "./planning-share-model";
import { readLimitedBody } from "./share-body";

it("bounds streamed bodies even when the content length is absent", async () => {
	const cancel = jest.fn();
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(new Uint8Array([1, 2]));
			controller.enqueue(new Uint8Array([3, 4]));
		},
		cancel,
	});
	await expect(readLimitedBody(body, 3)).rejects.toThrow("Body too large");
	expect(cancel).toHaveBeenCalledTimes(1);
	expect(body.locked).toBe(false);
});
it("combines bounded chunks and rejects missing bodies", async () => {
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(new Uint8Array([1, 2]));
			controller.enqueue(new Uint8Array([3]));
			controller.close();
		},
	});
	expect([...(await readLimitedBody(body, 3))]).toEqual([1, 2, 3]);
	await expect(readLimitedBody(null, 3)).rejects.toThrow("Missing body");
});
it("permits only HTTPS UploadThing image hosts without credentials or redirects", () => {
	for (const url of ["https://files.ufs.sh/f/a", "https://utfs.io/f/a"])
		expect(isShareImageUrl(url)).toBe(true);
	for (const url of [
		"http://files.ufs.sh/a",
		"https://ufs.sh.evil.com/a",
		"https://files.ufs.sh@evil.com/a",
		"https://x@files.ufs.sh/a",
		"https://127.0.0.1/a",
		"https://files.ufs.sh:8443/a",
		"not a url",
	])
		expect(isShareImageUrl(url)).toBe(false);
});
