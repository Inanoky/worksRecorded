export const DIARY_PHOTO_DELETED = "diary-photo-deleted";
export type DiaryPhotoDeleted = {
	siteId: string;
	deletedUrls: string[];
	deletedRecordIds: string[];
};
