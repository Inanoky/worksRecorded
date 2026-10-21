import { createHash } from "node:crypto";

export function previewSource(url: string) {
	return createHash("sha256").update(`full-page-hires-v2:${url}`).digest("hex");
}
