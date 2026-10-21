"use client";

import type { PlanningImage } from "./planning-image";
import type { VisualPlan } from "./planning-model";
import {
	publicWorkPath,
	SHARE_MAX_IMAGE,
	shareTokenSchema,
} from "./planning-share-model";

export async function preparePlanningImageForSend(
	image: Blob,
	signal: AbortSignal,
) {
	const bitmap = await createImageBitmap(image);
	const canvas = document.createElement("canvas");
	try {
		for (let level = 0; level < 4; level++) {
			signal.throwIfAborted();
			const scale = 0.8 ** level;
			canvas.width = Math.max(1, Math.round(bitmap.width * scale));
			canvas.height = Math.max(1, Math.round(bitmap.height * scale));
			const context = canvas.getContext("2d");
			if (!context) throw new Error("Image unavailable");
			context.fillStyle = "#ffffff";
			context.fillRect(0, 0, canvas.width, canvas.height);
			context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
			for (const quality of [0.9, 0.75, 0.6]) {
				const blob = await new Promise<Blob | null>((resolve) =>
					canvas.toBlob(resolve, "image/jpeg", quality),
				);
				signal.throwIfAborted();
				if (blob && blob.size <= SHARE_MAX_IMAGE) return blob;
			}
		}
		throw new Error("Image too large");
	} finally {
		bitmap.close();
		canvas.width = 0;
		canvas.height = 0;
	}
}

export async function publishPlanningShare(
	siteId: string,
	plan: VisualPlan,
	images: PlanningImage[],
	signal: AbortSignal,
) {
	const form = new FormData();
	form.set("planId", plan.id);
	form.set("version", String(plan.version));
	const zones = images.filter((image) => !image.section);
	form.set("pages", JSON.stringify(zones.map((image) => image.page)));
	for (const image of zones) {
		const blob = await preparePlanningImageForSend(image.blob, signal);
		form.append("images", blob, `page-${image.page}.jpg`);
	}
	signal.throwIfAborted();
	const response = await fetch(
		`/api/sites/${encodeURIComponent(siteId)}/visual/planning-share`,
		{ method: "POST", body: form, signal },
	);
	if (!response.ok) throw new Error("Share unavailable");
	const token = shareTokenSchema.parse((await response.json()).token);
	return {
		token,
		url: new URL(publicWorkPath(token), "https://www.worksrecorded.com").href,
		version: plan.version,
	};
}
