export function updateZtcMetadataProjectName(
	metadataValue: unknown,
	projectName: unknown,
) {
	if (typeof metadataValue !== "string" || !metadataValue.trim()) {
		return metadataValue;
	}

	try {
		const metadata = JSON.parse(metadataValue) as Record<string, unknown>;
		if (
			!metadata ||
			Array.isArray(metadata) ||
			!Object.hasOwn(metadata, "projectName")
		) {
			return metadataValue;
		}

		return JSON.stringify({
			...metadata,
			projectName: String(projectName ?? "").trim(),
		});
	} catch {
		return metadataValue;
	}
}

export function applyZtcProjectNameChange<T extends Record<string, unknown>>(
	row: T,
	projectName: unknown,
) {
	return {
		...row,
		Location: projectName,
		Comments_Custom_2: updateZtcMetadataProjectName(
			row.Comments_Custom_2,
			projectName,
		),
	};
}
