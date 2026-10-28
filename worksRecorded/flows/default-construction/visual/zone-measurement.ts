import polygonClipping, { type MultiPolygon } from "polygon-clipping";
import {
	type DrawingPageMeasurement,
	resolvedDrawingScale,
} from "./drawing-scale";
import { zoneGeometryArea } from "./zone-geometry";

export type VisualZoneMeasurement = {
	url: string;
	markId: string;
	page: number;
	scale: number | null;
	zoneArea: number | null;
	polygonArea: number | null;
};

export function measuredZoneGeometry(
	geometry: MultiPolygon,
	component: number,
	measurement: DrawingPageMeasurement | undefined,
	override?: number,
) {
	const scale = resolvedDrawingScale(measurement, override);
	if (!measurement || !scale || !geometry[component])
		return { scale, zoneArea: null, polygonArea: null };
	const factor =
		measurement.width * measurement.height * ((scale * 0.0254) / 72) ** 2;
	return {
		scale,
		zoneArea: zoneGeometryArea(polygonClipping.union(geometry)) * factor,
		polygonArea: zoneGeometryArea([geometry[component]]) * factor,
	};
}
