import catalog from "@/assets/visual-sections/ar-701/catalog.json";
import hipokratuCatalog from "@/assets/visual-sections/hipokratu-upb-bp8/catalog.json";
import raudasCatalog from "@/assets/visual-sections/raudas-16/catalog.json";

const key = (value: string) =>
	value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("lv");

function projectCatalog(projectName: string | undefined) {
	if (!projectName) return;
	const name = key(projectName);
	if (name === key(catalog.projectName)) return catalog;
	if (name === key(hipokratuCatalog.projectName)) return hipokratuCatalog;
	if (
		[raudasCatalog.projectName, ...raudasCatalog.projectAliases].some(
			(alias) => key(alias) === name,
		)
	)
		return raudasCatalog;
}

export function sectionCatalogForProject(projectName: string | undefined) {
	return projectCatalog(projectName)?.sections ?? [];
}

export function sectionDrawingDirectoryForProject(
	projectName: string | undefined,
) {
	return projectCatalog(projectName)?.id;
}

export function sectionDrawingForProject(
	projectName: string | undefined,
	section: string,
) {
	return sectionCatalogForProject(projectName).find(
		(item) => key(item.code) === key(section),
	);
}
