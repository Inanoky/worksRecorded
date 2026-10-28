import {
	normalizeVisualWork,
	readVisualLayerSettings,
	resolveVisualWorkLayer,
	visualLayerPositionIds,
} from "../visual/layer-settings";
import type { Forma2ClientCosts } from "./forma2-client-costs";

export function projectSpendingInput({
	data,
	config,
	rows,
}: {
	data: { siteName: string; clientCosts: Forma2ClientCosts };
	config: Record<string, unknown> | null;
	rows: readonly {
		id: string;
		originalUserComment?: string | null;
		Comments?: string | null;
	}[];
}) {
	const settings = readVisualLayerSettings(config ?? {});
	const positionIds = visualLayerPositionIds(config ?? {});
	const positionGroups = Object.fromEntries(
		data.clientCosts.positions.map((position) => [
			position.id,
			resolveVisualWorkLayer(position.name, settings, {
				...positionIds,
				[normalizeVisualWork(position.name)]: position.id,
			}),
		]),
	);
	return {
		current: data.clientCosts,
		proposed: data.clientCosts,
		reassignments: [],
		workGroups: settings.categories,
		positionGroups,
		siteName: data.siteName,
		sourceTexts: Object.fromEntries(
			rows.map((row) => [
				row.id,
				row.originalUserComment || row.Comments || "",
			]),
		),
		projectData: true,
	};
}
