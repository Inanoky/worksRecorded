export type PenPoint = { x: number; y: number };

function segmentDistance(point: PenPoint, a: PenPoint, b: PenPoint) {
	const dx = b.x - a.x,
		dy = b.y - a.y;
	const t =
		dx || dy
			? Math.max(
					0,
					Math.min(
						1,
						((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy),
					),
				)
			: 0;
	return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}

function simplify(points: PenPoint[], tolerance: number): PenPoint[] {
	if (points.length <= 2) return points;
	let distance = tolerance,
		index = 0;
	for (let i = 1; i < points.length - 1; i++) {
		const next = segmentDistance(
			points[i],
			points[0],
			points[points.length - 1],
		);
		if (next > distance) {
			distance = next;
			index = i;
		}
	}
	return index
		? [
				...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
				...simplify(points.slice(index), tolerance),
			]
		: [points[0], points[points.length - 1]];
}

export function simplifyPenOutline(
	points: PenPoint[],
	width: number,
	height: number,
) {
	const unique = points.filter(
		(point, index) =>
			!index ||
			point.x !== points[index - 1].x ||
			point.y !== points[index - 1].y,
	);
	if (
		unique.length > 1 &&
		Math.hypot(
			(unique[0].x - unique[unique.length - 1].x) * width,
			(unique[0].y - unique[unique.length - 1].y) * height,
		) < 6
	)
		unique.pop();
	if (unique.length < 4) return unique;
	const pixels = unique.map((point) => ({
		x: point.x * width,
		y: point.y * height,
	}));
	let opposite = 1;
	for (let i = 2; i < pixels.length; i++)
		if (
			Math.hypot(pixels[i].x - pixels[0].x, pixels[i].y - pixels[0].y) >
			Math.hypot(
				pixels[opposite].x - pixels[0].x,
				pixels[opposite].y - pixels[0].y,
			)
		)
			opposite = i;
	let result = pixels;
	for (
		let tolerance = 1.5;
		tolerance < Math.max(width, height) * 2;
		tolerance *= 1.4
	) {
		result = [
			...simplify(pixels.slice(0, opposite + 1), tolerance).slice(0, -1),
			...simplify([...pixels.slice(opposite), pixels[0]], tolerance).slice(
				0,
				-1,
			),
		];
		if (result.length <= 40) break;
	}
	return result.map((point) => ({ x: point.x / width, y: point.y / height }));
}
