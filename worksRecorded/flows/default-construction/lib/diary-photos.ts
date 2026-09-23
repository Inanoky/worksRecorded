export const LIMENI_ORGANIZATION_ID = "58467603-196e-4661-83ff-fe26e4b0ff0b";

export function hasInlineDiaryPhotos(organizationId?: string | null) {
	return organizationId === LIMENI_ORGANIZATION_ID;
}

export function normalizeDiaryPhotoUrls(urls: unknown): string[] {
	if (!Array.isArray(urls)) return [];
	return [
		...new Set(
			urls.filter((value): value is string => {
				if (typeof value !== "string") return false;
				try {
					const url = new URL(value);
					return url.protocol === "https:" && !url.username && !url.password;
				} catch {
					return false;
				}
			}),
		),
	];
}
