import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function createLocalEvalMedia(directory: string) {
	const files = new Map<string, { path: string; dataUrl: string }>();
	return {
		async add(file: string) {
			const bytes = await readFile(file);
			const name = `${createHash("sha256").update(bytes).digest("hex")}.jpg`;
			const storedPath = path.resolve(directory, name);
			await mkdir(directory, { recursive: true });
			await writeFile(storedPath, bytes);
			const url = `https://eval.test/local-media/${name}`;
			files.set(url, {
				path: storedPath,
				dataUrl: `data:image/jpeg;base64,${bytes.toString("base64")}`,
			});
			return url;
		},
		entries() {
			return [...files].map(([url, file]) => ({ url, path: file.path }));
		},
		async rewrite(input: RequestInfo | URL, init?: RequestInit) {
			const request =
				typeof Request !== "undefined" && input instanceof Request
					? input
					: null;
			const body =
				init?.body ?? (request ? await request.clone().text() : undefined);
			if (
				typeof body !== "string" ||
				!body.includes("https://eval.test/local-media/")
			)
				return { input, init };
			let payload: unknown;
			try {
				payload = JSON.parse(body);
			} catch {
				return { input, init };
			}
			const visit = (item: unknown): unknown => {
				if (Array.isArray(item)) return item.map(visit);
				if (!item || typeof item !== "object") return item;
				const object = item as Record<string, unknown>;
				if (
					object.type === "image_url" &&
					object.image_url &&
					typeof object.image_url === "object"
				) {
					const image = object.image_url as Record<string, unknown>;
					const file =
						typeof image.url === "string" ? files.get(image.url) : undefined;
					if (file)
						return { ...object, image_url: { ...image, url: file.dataUrl } };
				}
				if (
					object.type === "input_image" &&
					typeof object.image_url === "string"
				) {
					const file = files.get(object.image_url);
					if (file) return { ...object, image_url: file.dataUrl };
				}
				return Object.fromEntries(
					Object.entries(object).map(([key, value]) => [key, visit(value)]),
				);
			};
			const rewritten = JSON.stringify(visit(payload));
			if (request && !init?.body) {
				const headers = new Headers(request.headers);
				headers.delete("content-length");
				return {
					input: new Request(request, { headers, body: rewritten }),
					init,
				};
			}
			return { input, init: { ...init, body: rewritten } };
		},
	};
}
