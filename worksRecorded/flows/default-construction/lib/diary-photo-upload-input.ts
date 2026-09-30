import { z } from "zod";

export const diaryPhotoUploadInput = z.object({
	siteId: z.string().uuid(),
	recordId: z.string().trim().min(1).max(200),
});
