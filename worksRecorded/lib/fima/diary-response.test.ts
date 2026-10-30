import { createFimaDiaryStream } from "./diary-response";

async function read(payload: { rows: unknown[]; revision: string }) {
	const reader = createFimaDiaryStream(payload).getReader();
	const decoder = new TextDecoder();
	const chunks: number[] = [];
	let text = "";
	for (;;) {
		const next = await reader.read();
		if (next.done) break;
		chunks.push(next.value.byteLength);
		text += decoder.decode(next.value, { stream: true });
	}
	return { data: JSON.parse(text + decoder.decode()), chunks };
}
it.each([0, 1, 25, 26, 75])(
	"streams a valid JSON payload with %i records",
	async (size) => {
		const payload = {
			revision: "v1",
			rows: Array.from({ length: size }, (_, id) => ({
				id,
				Date: new Date("2026-10-30"),
				Comments: 'Ieva: "Pārbaudīt"',
			})),
		};
		expect((await read(payload)).data).toEqual(
			JSON.parse(JSON.stringify(payload)),
		);
	},
);
it("streams a project larger than the buffered response limit in small batches", async () => {
	const payload = {
		revision: "large-project",
		rows: Array.from({ length: 800 }, (_, id) => ({
			id,
			Works: "ā".repeat(4000),
		})),
	};
	const { data, chunks } = await read(payload);
	expect(data.rows).toHaveLength(800);
	expect(chunks.reduce((a, b) => a + b, 0)).toBeGreaterThan(4.5 * 1024 * 1024);
	expect(Math.max(...chunks)).toBeLessThan(256 * 1024);
	expect(data.rows[799]).toEqual(payload.rows[799]);
});
