type ExportPhoto = {
	id: string;
	Date: Date | null;
	createdAt: Date;
	fileUrl: string;
};

type PreparedExportPhoto = ExportPhoto & {
	archiveBasePath: string;
	exportDate: Date;
};

type ZipCentralEntry = {
	crc32: number;
	dosDate: number;
	dosTime: number;
	localHeaderOffset: number;
	name: Uint8Array;
	size: number;
};

type PhotoFetchResponse = {
	ok: boolean;
	status: number;
	body: ReadableStream<Uint8Array> | null;
	headers: Pick<Headers, "get">;
};

type PhotoFetcher = (url: string) => Promise<PhotoFetchResponse>;

const textEncoder = new TextEncoder();
const ZIP_UTF8_DATA_DESCRIPTOR_FLAG = 0x0808;
const ZIP_VERSION = 20;
const ZIP_MAX_UINT16 = 0xffff;
const ZIP_MAX_UINT32 = 0xffffffff;

const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
	let value = index;
	for (let bit = 0; bit < 8; bit += 1) {
		value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
	}
	return value >>> 0;
});

function createBytes(length: number, write: (view: DataView) => void) {
	const bytes = new Uint8Array(length);
	write(new DataView(bytes.buffer));
	return bytes;
}

function updateCrc32(crc: number, chunk: Uint8Array) {
	let next = crc;
	for (const byte of chunk) {
		next = CRC32_TABLE[(next ^ byte) & 0xff] ^ (next >>> 8);
	}
	return next >>> 0;
}

function getDosDateTime(date: Date) {
	const year = Math.min(2107, Math.max(1980, date.getUTCFullYear()));
	return {
		dosDate:
			((year - 1980) << 9) |
			((date.getUTCMonth() + 1) << 5) |
			date.getUTCDate(),
		dosTime:
			(date.getUTCHours() << 11) |
			(date.getUTCMinutes() << 5) |
			Math.floor(date.getUTCSeconds() / 2),
	};
}

function createLocalHeader(name: Uint8Array, dosDate: number, dosTime: number) {
	return createBytes(30 + name.length, (view) => {
		view.setUint32(0, 0x04034b50, true);
		view.setUint16(4, ZIP_VERSION, true);
		view.setUint16(6, ZIP_UTF8_DATA_DESCRIPTOR_FLAG, true);
		view.setUint16(8, 0, true);
		view.setUint16(10, dosTime, true);
		view.setUint16(12, dosDate, true);
		view.setUint16(26, name.length, true);
		new Uint8Array(view.buffer, 30).set(name);
	});
}

function createDataDescriptor(crc32: number, size: number) {
	return createBytes(16, (view) => {
		view.setUint32(0, 0x08074b50, true);
		view.setUint32(4, crc32, true);
		view.setUint32(8, size, true);
		view.setUint32(12, size, true);
	});
}

function createCentralHeader(entry: ZipCentralEntry) {
	return createBytes(46 + entry.name.length, (view) => {
		view.setUint32(0, 0x02014b50, true);
		view.setUint16(4, ZIP_VERSION, true);
		view.setUint16(6, ZIP_VERSION, true);
		view.setUint16(8, ZIP_UTF8_DATA_DESCRIPTOR_FLAG, true);
		view.setUint16(10, 0, true);
		view.setUint16(12, entry.dosTime, true);
		view.setUint16(14, entry.dosDate, true);
		view.setUint32(16, entry.crc32, true);
		view.setUint32(20, entry.size, true);
		view.setUint32(24, entry.size, true);
		view.setUint16(28, entry.name.length, true);
		view.setUint32(42, entry.localHeaderOffset, true);
		new Uint8Array(view.buffer, 46).set(entry.name);
	});
}

function createEndRecord(
	entryCount: number,
	centralSize: number,
	centralOffset: number,
) {
	return createBytes(22, (view) => {
		view.setUint32(0, 0x06054b50, true);
		view.setUint16(8, entryCount, true);
		view.setUint16(10, entryCount, true);
		view.setUint32(12, centralSize, true);
		view.setUint32(16, centralOffset, true);
	});
}

async function* readWebStream(body: ReadableStream<Uint8Array>) {
	const reader = body.getReader();
	try {
		while (true) {
			const result = await reader.read();
			if (result.done) return;
			yield result.value;
		}
	} finally {
		reader.releaseLock();
	}
}

async function* readBytes(bytes: Uint8Array) {
	yield bytes;
}

async function* writeStoredEntry(args: {
	name: string;
	modifiedAt: Date;
	localHeaderOffset: number;
	source: AsyncIterable<Uint8Array>;
}): AsyncGenerator<Uint8Array, ZipCentralEntry, void> {
	const name = textEncoder.encode(args.name);
	const { dosDate, dosTime } = getDosDateTime(args.modifiedAt);
	yield createLocalHeader(name, dosDate, dosTime);

	let crc32 = ZIP_MAX_UINT32;
	let size = 0;
	for await (const chunk of args.source) {
		size += chunk.byteLength;
		if (size > ZIP_MAX_UINT32) {
			throw new Error(`Photo is too large for ZIP export: ${args.name}`);
		}
		crc32 = updateCrc32(crc32, chunk);
		yield chunk;
	}

	crc32 = (crc32 ^ ZIP_MAX_UINT32) >>> 0;
	yield createDataDescriptor(crc32, size);

	return {
		crc32,
		dosDate,
		dosTime,
		localHeaderOffset: args.localHeaderOffset,
		name,
		size,
	};
}

function getImageExtension(contentType: string | null, fileUrl: string) {
	const mimeExtensions: Record<string, string> = {
		"image/avif": "avif",
		"image/bmp": "bmp",
		"image/gif": "gif",
		"image/heic": "heic",
		"image/heif": "heif",
		"image/jpeg": "jpg",
		"image/png": "png",
		"image/tiff": "tif",
		"image/webp": "webp",
	};
	const normalizedContentType = contentType
		?.split(";", 1)[0]
		?.trim()
		.toLowerCase();
	if (normalizedContentType && mimeExtensions[normalizedContentType]) {
		return mimeExtensions[normalizedContentType];
	}

	try {
		const match = new URL(fileUrl).pathname.match(/\.([a-z0-9]{2,5})$/i);
		if (match) return match[1].toLowerCase();
	} catch {
		return "jpg";
	}
	return "jpg";
}

export function isAllowedPhotoExportUrl(fileUrl: string) {
	try {
		const url = new URL(fileUrl);
		const hostname = url.hostname.toLowerCase();
		return (
			url.protocol === "https:" &&
			(hostname === "ufs.sh" ||
				hostname.endsWith(".ufs.sh") ||
				hostname === "utfs.io" ||
				hostname.endsWith(".utfs.io") ||
				hostname === "uploadthing.com" ||
				hostname.endsWith(".uploadthing.com"))
		);
	} catch {
		return false;
	}
}

export function preparePhotoExportEntries(
	photos: ExportPhoto[],
): PreparedExportPhoto[] {
	const sortedPhotos = [...photos].sort((left, right) => {
		const dateDifference =
			(left.Date ?? left.createdAt).getTime() -
			(right.Date ?? right.createdAt).getTime();
		return dateDifference || left.id.localeCompare(right.id);
	});
	const monthCounters = new Map<string, number>();

	return sortedPhotos.map((photo) => {
		const exportDate = photo.Date ?? photo.createdAt;
		const year = exportDate.getUTCFullYear();
		const month = String(exportDate.getUTCMonth() + 1).padStart(2, "0");
		const day = String(exportDate.getUTCDate()).padStart(2, "0");
		const monthFolder = `${year}-${month}`;
		const sequence = (monthCounters.get(monthFolder) ?? 0) + 1;
		monthCounters.set(monthFolder, sequence);

		return {
			...photo,
			archiveBasePath: `${monthFolder}/${year}-${month}-${day}_${String(sequence).padStart(3, "0")}_${photo.id.slice(0, 8)}`,
			exportDate,
		};
	});
}

async function* createPhotoZip(
	photos: PreparedExportPhoto[],
	fetcher: PhotoFetcher,
): AsyncGenerator<Uint8Array, void, void> {
	const centralEntries: ZipCentralEntry[] = [];
	const failures: string[] = [];
	let offset = 0;

	for (const photo of photos) {
		if (!isAllowedPhotoExportUrl(photo.fileUrl)) {
			failures.push(`${photo.archiveBasePath}: unsupported file URL`);
			continue;
		}

		let response: PhotoFetchResponse;
		try {
			response = await fetcher(photo.fileUrl);
		} catch {
			failures.push(`${photo.archiveBasePath}: download failed`);
			continue;
		}

		if (!response.ok || !response.body) {
			failures.push(
				`${photo.archiveBasePath}: download failed (${response.status})`,
			);
			continue;
		}

		const extension = getImageExtension(
			response.headers.get("content-type"),
			photo.fileUrl,
		);
		const writer = writeStoredEntry({
			name: `${photo.archiveBasePath}.${extension}`,
			modifiedAt: photo.exportDate,
			localHeaderOffset: offset,
			source: readWebStream(response.body),
		});

		while (true) {
			const result = await writer.next();
			if (result.done) {
				centralEntries.push(result.value);
				break;
			}
			offset += result.value.byteLength;
			if (offset > ZIP_MAX_UINT32)
				throw new Error("Photo export is too large for ZIP format");
			yield result.value;
		}
	}

	if (failures.length > 0) {
		const failureText = textEncoder.encode(
			`Some photos could not be included:\r\n\r\n${failures.join("\r\n")}\r\n`,
		);
		const writer = writeStoredEntry({
			name: "export-errors.txt",
			modifiedAt: new Date(),
			localHeaderOffset: offset,
			source: readBytes(failureText),
		});
		while (true) {
			const result = await writer.next();
			if (result.done) {
				centralEntries.push(result.value);
				break;
			}
			offset += result.value.byteLength;
			yield result.value;
		}
	}

	if (centralEntries.length > ZIP_MAX_UINT16) {
		throw new Error("Photo export contains too many files for ZIP format");
	}

	const centralOffset = offset;
	for (const entry of centralEntries) {
		const header = createCentralHeader(entry);
		offset += header.byteLength;
		yield header;
	}
	const centralSize = offset - centralOffset;
	yield createEndRecord(centralEntries.length, centralSize, centralOffset);
}

export function createPhotoZipStream(
	photos: ExportPhoto[],
	fetcher: PhotoFetcher = (url) => fetch(url),
) {
	const iterator = createPhotoZip(preparePhotoExportEntries(photos), fetcher);
	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			try {
				const result = await iterator.next();
				if (result.done) {
					controller.close();
					return;
				}
				controller.enqueue(result.value);
			} catch (error) {
				controller.error(error);
			}
		},
		async cancel() {
			await iterator.return(undefined);
		},
	});
}
