export function isProdevOrganization(name: string | null | undefined) {
	const normalized = name?.toLocaleLowerCase("lv").replace(/[^a-z0-9]/g, "");
	return (
		normalized === "prodev" ||
		normalized === "siaprodev" ||
		normalized === "prodevsia"
	);
}
