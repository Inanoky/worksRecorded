import catalog from "@/assets/visual-sections/ar-701/catalog.json";

const key = (value: string) =>
	value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("lv");

export function sectionCatalogForProject(projectName: string | undefined) {
	return projectName && key(projectName) === key(catalog.projectName)
		? catalog.sections
		: [];
}

export function sectionDrawingForProject(
	projectName: string | undefined,
	section: string,
) {
	return sectionCatalogForProject(projectName).find(
		(item) => key(item.code) === key(section),
	);
}
