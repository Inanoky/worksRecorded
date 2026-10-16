import type { PDFDocumentProxy } from "pdfjs-dist";
import type { VisualPlan, VisualPlanArea } from "./planning-model";

export type PlanningImage = { page: number; blob: Blob; section?: string };

export function planningImageRegion(areas: VisualPlanArea[]) {
	const points = areas.flatMap((area) => area.polygon);
	if (!points.length) throw new Error("Plānam nav saglabātu zonu.");
	const xs = points.map((point) => point.x);
	const ys = points.map((point) => point.y);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);
	const width = Math.min(1, Math.max(0.004, (maxX - minX) * 1.24));
	const height = Math.min(1, Math.max(0.004, (maxY - minY) * 1.24));
	return {
		x: Math.max(0, Math.min(1 - width, (minX + maxX - width) / 2)),
		y: Math.max(0, Math.min(1 - height, (minY + maxY - height) / 2)),
		width,
		height,
	};
}

function fitText(
	context: CanvasRenderingContext2D,
	text: string,
	width: number,
) {
	if (context.measureText(text).width <= width) return text;
	let short = text;
	while (short.length && context.measureText(`${short}…`).width > width)
		short = short.slice(0, -1);
	return `${short}…`;
}

export async function renderPlanningImages(
	pdf: PDFDocumentProxy,
	plan: VisualPlan,
	color: string,
	signal: AbortSignal,
): Promise<PlanningImage[]> {
	const pages = [...new Set(plan.geometry.areas.map((area) => area.page))].sort(
		(left, right) => left - right,
	);
	if (!pages.length) throw new Error("Plānam nav saglabātu zonu.");
	const images: PlanningImage[] = [];
	for (const pageNumber of pages) {
		signal.throwIfAborted();
		const areas = plan.geometry.areas.filter(
			(area) => area.page === pageNumber,
		);
		const crop = planningImageRegion(areas);
		const page = await pdf.getPage(pageNumber);
		signal.throwIfAborted();
		const base = page.getViewport({ scale: 1 });
		const scale = Math.min(
			1600 / (base.width * crop.width),
			1800 / (base.height * crop.height),
		);
		const viewport = page.getViewport({ scale });
		const header = 112;
		const canvas = document.createElement("canvas");
		canvas.width = Math.ceil(viewport.width * crop.width);
		canvas.height = Math.ceil(viewport.height * crop.height) + header;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Neizdevās sagatavot zonas attēlu.");
		const offsetX = crop.x * viewport.width;
		const offsetY = crop.y * viewport.height;
		const render = page.render({
			canvas,
			canvasContext: context,
			viewport,
			transform: [1, 0, 0, 1, -offsetX, header - offsetY],
		});
		const cancel = () => render.cancel();
		signal.addEventListener("abort", cancel, { once: true });
		try {
			await render.promise;
			signal.throwIfAborted();
			context.save();
			context.beginPath();
			context.rect(0, header, canvas.width, canvas.height - header);
			context.clip();
			for (const area of areas) {
				context.beginPath();
				area.polygon.forEach((point, index) => {
					const x = point.x * viewport.width - offsetX;
					const y = point.y * viewport.height - offsetY + header;
					if (index === 0) context.moveTo(x, y);
					else context.lineTo(x, y);
				});
				context.closePath();
				context.fillStyle = color;
				context.globalAlpha = 0.24;
				context.fill();
				context.globalAlpha = 1;
				context.lineWidth = 8;
				context.strokeStyle = "#ffffff";
				context.stroke();
				context.lineWidth = 4;
				context.strokeStyle = color;
				context.setLineDash([12, 7]);
				context.stroke();
				context.setLineDash([]);
			}
			context.restore();
			context.fillStyle = "#ffffff";
			context.fillRect(0, 0, canvas.width, header);
			context.fillStyle = "#0f172a";
			context.font = "600 26px Arial";
			context.fillText(fitText(context, plan.work, canvas.width - 48), 24, 36);
			context.font = "20px Arial";
			context.fillText(
				fitText(context, plan.location, canvas.width - 48),
				24,
				66,
			);
			context.font = "16px Arial";
			context.fillText(`Plānotā darba zona · PDF lapa ${pageNumber}`, 24, 92);
			const blob = await new Promise<Blob>((resolve, reject) =>
				canvas.toBlob(
					(value) =>
						value
							? resolve(value)
							: reject(new Error("Neizdevās saglabāt zonas attēlu.")),
					"image/png",
				),
			);
			signal.throwIfAborted();
			images.push({ page: pageNumber, blob });
		} finally {
			signal.removeEventListener("abort", cancel);
			canvas.width = 0;
			canvas.height = 0;
		}
	}
	return images;
}
