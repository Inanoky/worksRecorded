import { deletePhotoById as serverDelete } from "@/server/actions/site-diary-actions";
import { deletePhotoById } from "./delete-photo-client";
import { DIARY_PHOTO_DELETED } from "./photo-deleted-event";

jest.mock("@/server/actions/site-diary-actions", () => ({
	deletePhotoById: jest.fn(),
}));

it("notifies retained views only after a successful server deletion", async () => {
	const listener = jest.fn();
	window.addEventListener(DIARY_PHOTO_DELETED, listener);
	try {
		const result = {
			ok: true,
			siteId: "site",
			deletedUrls: ["https://example.com/old"],
			deletedRecordIds: ["owner"],
		};
		jest.mocked(serverDelete).mockResolvedValue(result);
		await deletePhotoById("photo");
		expect(listener.mock.calls[0][0].detail).toEqual(result);
		listener.mockClear();
		jest.mocked(serverDelete).mockRejectedValue(new Error("failed"));
		await expect(deletePhotoById("photo")).rejects.toThrow("failed");
		expect(listener).not.toHaveBeenCalled();
	} finally {
		window.removeEventListener(DIARY_PHOTO_DELETED, listener);
	}
});
