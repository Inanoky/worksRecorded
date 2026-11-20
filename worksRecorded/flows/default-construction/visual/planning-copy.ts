import type { VisualPlan, VisualPlanInput } from "./planning-model";

export function copyVisualPlanGeometry(
	source: Pick<VisualPlan, "id" | "version" | "geometry">,
	areaId?: string,
	copyId: string = crypto.randomUUID(),
): VisualPlan["geometry"] {
	const areas = areaId
		? source.geometry.areas.filter((area) => area.id === areaId)
		: source.geometry.areas;
	if (!areas.length) throw new Error("Kopējamais poligons nav atrasts.");
	return {
		version: 1,
		quantitySource: "area",
		...(source.geometry.section ? { section: source.geometry.section } : {}),
		areas: areas.map((area, index) => ({
			id: `${copyId}:${index + 1}`,
			page: area.page,
			polygon: area.polygon.map((point) => ({ ...point })),
		})),
		copiedFrom: {
			planId: source.id,
			version: source.version,
			areaIds: areas.map((area) => area.id),
		},
	};
}

export function visualWorkGeometry(input: VisualPlanInput, planId: string) {
	if (
		!input.additionalWorks ||
		input.geometryMode !== "independent" ||
		planId === input.clientId
	)
		return input.geometry;
	if (!input.clientId) throw new Error("Trūkst kopēšanas avota.");
	return {
		...input.geometry,
		...copyVisualPlanGeometry(
			{ id: input.clientId, version: 1, geometry: input.geometry },
			undefined,
			planId,
		),
	};
}
