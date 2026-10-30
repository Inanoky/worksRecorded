export function createFimaDiaryStream<T extends { rows: unknown[] }>(
	payload: T,
) {
	const { rows, ...metadata } = payload;
	const prefix = JSON.stringify({ ...metadata, rows: [] }).slice(0, -2);
	const encoder = new TextEncoder();
	let index = -1;
	return new ReadableStream<Uint8Array>({
		pull(controller) {
			if (index === -1) {
				controller.enqueue(encoder.encode(prefix));
				index = 0;
			} else if (index < rows.length) {
				const batch = rows
					.slice(index, index + 25)
					.map((row) => JSON.stringify(row))
					.join(",");
				controller.enqueue(encoder.encode(`${index ? "," : ""}${batch}`));
				index += 25;
			} else {
				controller.enqueue(encoder.encode("]}"));
				controller.close();
			}
		},
	});
}
