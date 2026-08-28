import {
	createPhotoZipStream,
	isAllowedPhotoExportUrl,
	preparePhotoExportEntries,
} from "./photo-export-zip";

function byteStream(value: string) {
	const bytes = new TextEncoder().encode(value);
	return new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(bytes);
			controller.close();
		},
	});
}

async function readStream(stream: ReadableStream<Uint8Array>) {
	const chunks: Uint8Array[] = [];
	let length = 0;
	const reader = stream.getReader();
	while (true) {
		const result = await reader.read();
		if (result.done) break;
		chunks.push(result.value);
		length += result.value.byteLength;
	}

	const output = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		output.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return output;
}

describe("photo export ZIP", () => {
	it("sorts photos into month folders with stable names", () => {
		const entries = preparePhotoExportEntries([
			{
				id: "february-photo",
				Date: new Date("2026-02-03T10:00:00.000Z"),
				createdAt: new Date("2026-02-03T10:00:00.000Z"),
				fileUrl: "https://files.ufs.sh/f/february",
			},
			{
				id: "january-second",
				Date: new Date("2026-01-20T10:00:00.000Z"),
				createdAt: new Date("2026-01-20T10:00:00.000Z"),
				fileUrl: "https://files.ufs.sh/f/january-second",
			},
			{
				id: "january-first",
				Date: new Date("2026-01-02T10:00:00.000Z"),
				createdAt: new Date("2026-01-02T10:00:00.000Z"),
				fileUrl: "https://files.ufs.sh/f/january-first",
			},
		]);

		expect(entries.map((entry) => entry.archiveBasePath)).toEqual([
			"2026-01/2026-01-02_001_january-",
			"2026-01/2026-01-20_002_january-",
			"2026-02/2026-02-03_001_february",
		]);
	});

	it("creates a ZIP containing the month-based image paths", async () => {
		const stream = createPhotoZipStream(
			[
				{
					id: "photo-a",
					Date: new Date("2026-01-02T10:00:00.000Z"),
					createdAt: new Date("2026-01-02T10:00:00.000Z"),
					fileUrl: "https://files.ufs.sh/f/photo-a",
				},
				{
					id: "photo-b",
					Date: new Date("2026-02-03T10:00:00.000Z"),
					createdAt: new Date("2026-02-03T10:00:00.000Z"),
					fileUrl: "https://files.ufs.sh/f/photo-b",
				},
			],
			async () => ({
				ok: true,
				status: 200,
				body: byteStream("image bytes"),
				headers: { get: () => "image/jpeg" },
			}),
		);

		const zip = await readStream(stream);
		const zipText = new TextDecoder().decode(zip);
		const endRecord = new DataView(
			zip.buffer,
			zip.byteOffset + zip.byteLength - 22,
			22,
		);

		expect(new DataView(zip.buffer, zip.byteOffset, 4).getUint32(0, true)).toBe(
			0x04034b50,
		);
		expect(zipText).toContain("2026-01/2026-01-02_001_photo-a.jpg");
		expect(zipText).toContain("2026-02/2026-02-03_001_photo-b.jpg");
		expect(endRecord.getUint32(0, true)).toBe(0x06054b50);
		expect(endRecord.getUint16(10, true)).toBe(2);
	});

	it("only downloads persisted UploadThing URLs", () => {
		expect(isAllowedPhotoExportUrl("https://files.ufs.sh/f/photo")).toBe(true);
		expect(isAllowedPhotoExportUrl("https://utfs.io/f/photo")).toBe(true);
		expect(isAllowedPhotoExportUrl("http://files.ufs.sh/f/photo")).toBe(false);
		expect(isAllowedPhotoExportUrl("https://example.com/photo.jpg")).toBe(
			false,
		);
	});
});
