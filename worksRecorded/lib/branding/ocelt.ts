export function isOceltOrganization(name: string | null | undefined) {
	return name?.trim().toLowerCase() === "ocelt";
}
