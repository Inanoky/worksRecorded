import { isAllowedPhotoExportUrl } from "./photo-export-zip";

type SizeResponse = {
	ok: boolean;
	headers: Pick<Headers, "get">;
};

type SizeFetcher = (
	url: string,
	init: { method: "HEAD"; cache: "no-store"; signal: AbortSignal },
) => Promise<SizeResponse>;

const MAX_SIZE_SAMPLES = 50;
const SIZE_REQUEST_CONCURRENCY = 8;
const SIZE_REQUEST_TIMEOUT_MS = 5_000;

function selectSamples(fileUrls: string[]) {
	if (fileUrls.length <= MAX_SIZE_SAMPLES) return fileUrls;
	return Array.from({ length: MAX_SIZE_SAMPLES }, (_, index) => {
		return fileUrls[Math.floor((index * fileUrls.length) / MAX_SIZE_SAMPLES)];
	});
}

function readContentLength(response: SizeResponse) {
	if (!response.ok) return null;
	const value = Number(response.headers.get("content-length"));
	return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export async function estimatePhotoExportSize(
	fileUrls: string[],
	fetcher: SizeFetcher = (url, init) => fetch(url, init),
) {
	const samples = selectSamples(fileUrls).filter(isAllowedPhotoExportUrl);
	const sizes: number[] = [];

	for (
		let index = 0;
		index < samples.length;
		index += SIZE_REQUEST_CONCURRENCY
	) {
		const batch = samples.slice(index, index + SIZE_REQUEST_CONCURRENCY);
		const batchSizes = await Promise.all(
			batch.map(async (fileUrl) => {
				try {
					const response = await fetcher(fileUrl, {
						method: "HEAD",
						cache: "no-store",
						signal: AbortSignal.timeout(SIZE_REQUEST_TIMEOUT_MS),
					});
					return readContentLength(response);
				} catch {
					return null;
				}
			}),
		);
		sizes.push(...batchSizes.filter((size): size is number => size !== null));
	}

	if (sizes.length === 0) {
		return {
			estimatedBytes: null,
			isEstimate: true,
			knownPhotoCount: 0,
			sampledPhotoCount: samples.length,
		};
	}

	const sampledBytes = sizes.reduce((sum, size) => sum + size, 0);
	const estimatedBytes = Math.round(
		(sampledBytes / sizes.length) * fileUrls.length,
	);

	return {
		estimatedBytes,
		isEstimate:
			sizes.length !== fileUrls.length || samples.length !== fileUrls.length,
		knownPhotoCount: sizes.length,
		sampledPhotoCount: samples.length,
	};
}
