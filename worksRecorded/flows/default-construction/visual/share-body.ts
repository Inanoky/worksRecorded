export async function readLimitedBody(
	body: ReadableStream<Uint8Array> | null,
	limit: number,
) {
	if (!body) throw new Error("Missing body");
	const reader = body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const item = await reader.read();
			if (item.done) break;
			size += item.value.length;
			if (size > limit) {
				await reader.cancel();
				throw new Error("Body too large");
			}
			chunks.push(item.value);
		}
	} finally {
		reader.releaseLock();
	}
	const result = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return result;
}
