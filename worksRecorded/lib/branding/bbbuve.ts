export function isBbbuveOrganization(name: string | null | undefined) {
	const normalized = name
		?.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
	return (
		normalized === "bbbuve" ||
		normalized === "siabbbuve" ||
		normalized === "bbbuvesia"
	);
}
