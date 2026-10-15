type DescriptionRow = {
	[key: string]: unknown;
};

export function getBisWorkDescription(
	row: DescriptionRow,
	config: { otherSettings?: { bisWorkDescriptionField?: unknown } },
) {
	const configured = config.otherSettings?.bisWorkDescriptionField;
	const field =
		typeof configured === "string" &&
		[
			"Works",
			"Works_Custom_1",
			"Works_Custom_2",
			"Comments",
			"Comments_Custom_1",
			"Comments_Custom_2",
		].includes(configured)
			? configured
			: "Comments";
	return String(row[field] ?? "");
}
