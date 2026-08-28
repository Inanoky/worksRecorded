import { estimatePhotoExportSize } from "./photo-export-size";

function response(contentLength: number | null, ok = true) {
	return {
		ok,
		headers: {
			get: () => (contentLength === null ? null : String(contentLength)),
		},
	};
}

describe("photo export size estimate", () => {
	it("adds exact sizes when every photo reports a content length", async () => {
		const result = await estimatePhotoExportSize(
			["https://files.ufs.sh/f/one", "https://files.ufs.sh/f/two"],
			async (url) => response(url.endsWith("one") ? 1_000 : 2_000),
		);

		expect(result).toEqual({
			estimatedBytes: 3_000,
			isEstimate: false,
			knownPhotoCount: 2,
			sampledPhotoCount: 2,
		});
	});

	it("uses the known average when some sizes are unavailable", async () => {
		const result = await estimatePhotoExportSize(
			[
				"https://files.ufs.sh/f/one",
				"https://files.ufs.sh/f/two",
				"https://files.ufs.sh/f/three",
			],
			async (url) => response(url.endsWith("two") ? null : 1_500),
		);

		expect(result.estimatedBytes).toBe(4_500);
		expect(result.isEstimate).toBe(true);
		expect(result.knownPhotoCount).toBe(2);
	});
});
