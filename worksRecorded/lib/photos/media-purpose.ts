export const PHOTO_MEDIA_PURPOSE_SITE_DIARY = "site_diary";
export const PHOTO_MEDIA_PURPOSE_WAREHOUSE_INVOICE = "warehouse_invoice";

export function siteDiaryPhotoPurposeWhere() {
	return {
		OR: [
			{ mediaPurpose: null },
			{ mediaPurpose: PHOTO_MEDIA_PURPOSE_SITE_DIARY },
		],
	};
}
