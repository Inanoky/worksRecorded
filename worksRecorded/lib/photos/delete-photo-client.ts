"use client";

import { deletePhotoById as deletePhoto } from "@/server/actions/site-diary-actions";
import { DIARY_PHOTO_DELETED } from "./photo-deleted-event";

export async function deletePhotoById(id: string) {
	const result = await deletePhoto(id);
	if (result?.deletedUrls?.length) {
		window.dispatchEvent(
			new CustomEvent(DIARY_PHOTO_DELETED, { detail: result }),
		);
	}
	return result;
}
