import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createLocalEvalMedia } from "./local-media";

it("stores image bytes locally and sends them only as inference image inputs", async () => {
	const directory = await mkdtemp(path.join(tmpdir(), "eval-media-"));
	try {
		const original = path.join(directory, "source.jpg");
		const bytes = Buffer.from([255, 216, 255, 217]);
		await writeFile(original, bytes);
		const media = createLocalEvalMedia(path.join(directory, "media"));
		const url = await media.add(original);
		expect(url).toMatch(/^https:\/\/eval.test\/local-media\/[a-f0-9]+\.jpg$/);
		expect(url.length).toBeLessThan(150);
		expect(await readFile(media.entries()[0].path)).toEqual(bytes);
		const payload = {
			messages: [
				{
					content: [
						{ type: "text", text: url },
						{ type: "image_url", image_url: { url } },
					],
				},
			],
			input: [{ type: "input_image", image_url: url }],
		};
		const rewritten = await media.rewrite(
			"https://api.openai.com/v1/responses",
			{ body: JSON.stringify(payload) },
		);
		const body = JSON.parse(String(rewritten.init?.body));
		expect(body.messages[0].content[0].text).toBe(url);
		expect(body.messages[0].content[1].image_url.url).toBe(
			`data:image/jpeg;base64,${bytes.toString("base64")}`,
		);
		expect(body.input[0].image_url).toBe(
			body.messages[0].content[1].image_url.url,
		);
		expect(media.entries()[0].url).toBe(url);
		expect(JSON.stringify(media.entries())).not.toContain("base64");
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
