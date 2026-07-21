import { UTApi } from "uploadthing/server";
import { getUploadThingFileUrl } from "@/lib/utils/uploadthing-file-url";
import {
  fetchWhatsAppMediaAsBuffer,
  getString,
} from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage } from "@/lib/utils/whatsapp-helpers/shared/sender";
import { savePhoto } from "@/server/actions/site-diary-actions";

export type UploadedImageContext = {
  publicUrl: string;
  contentType: string;
  body: string;
  to: string | null;
  formData: FormData;
};

export type HandleImageResult =
  | {
      outcome: "photo_saved";
      savedPhoto: Awaited<ReturnType<typeof savePhoto>>;
    }
  | { outcome: "handled_after_upload" }
  | { outcome: "upload_failed" }
  | { outcome: "error" };

const utapi = new UTApi();

function getEvalUploadedImageUrl() {
  if (process.env.RUN_AI_EVALS !== "true") return null;
  const value = process.env.AI_EVAL_UPLOADED_IMAGE_URL;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function handleImage(args: {
  formData: FormData;
  numMedia: number;
  userId?: string | null; // ✅ allow userId for site manager route
  workerId?: string | null; // ✅ optional workerId for worker route
  siteId: string;
  to: string | null;
  body: string;
  photographerName?: string | null;
  onUploadedImage?: (context: UploadedImageContext) => Promise<boolean>;
  acknowledgeSavedPhoto?: boolean;
  imageIndex?: number;
}): Promise<HandleImageResult | false> {
  const {
    formData,
    numMedia,
    workerId,
    siteId,
    to,
    body,
    userId,
    photographerName,
    onUploadedImage,
    acknowledgeSavedPhoto = true,
    imageIndex,
  } = args;

  const idx = imageIndex ?? findFirstImageIndex(formData, numMedia);
  if (idx < 0) return false;

  const selectedContentType = (
    getString(formData, `MediaContentType${idx}`) || ""
  ).toLowerCase();
  if (imageIndex != null && !selectedContentType.startsWith("image/")) {
    return false;
  }

  const mediaUrl = getString(formData, `MediaUrl${idx}`);
  const contentType = (selectedContentType || "image/jpeg").toLowerCase();

  try {
    if (!mediaUrl) {
      await sendMessage(to, "Sorry, failed to retrieve the image.");
      return { outcome: "upload_failed" };
    }

    const buf = await fetchWhatsAppMediaAsBuffer(mediaUrl);

    const ext = contentType.split("/")[1] || "jpg";
    const fileName = `whatsapp_${Date.now()}.${ext}`;
    const file = new File([buf], fileName, { type: contentType });

    let resolvedPublicUrl = getEvalUploadedImageUrl();

    if (!resolvedPublicUrl) {
      const uploaded = await utapi.uploadFiles([file]);
      const first = Array.isArray(uploaded) ? uploaded[0] : uploaded;

      if (first?.error || !first?.data) {
        await sendMessage(to, "Sorry, failed to store the image.");
        return { outcome: "upload_failed" };
      }

      resolvedPublicUrl = getUploadThingFileUrl(first.data);
    }

    if (!resolvedPublicUrl) {
      await sendMessage(to, "Sorry, failed to store the image.");
      return { outcome: "upload_failed" };
    }

    if (onUploadedImage) {
      const wasHandled = await onUploadedImage({
        publicUrl: resolvedPublicUrl,
        contentType,
        body,
        to,
        formData,
      });

      if (wasHandled) return { outcome: "handled_after_upload" };
    }

    const trimmedBody = body.trim();
    const trimmedPhotographerName = photographerName?.trim() ?? "";
    const prefixedComment = trimmedPhotographerName
      ? trimmedBody
        ? `${trimmedPhotographerName} : ${trimmedBody}`
        : trimmedPhotographerName
      : trimmedBody || null;

    const savedPhoto = await savePhoto({
      workerId: workerId ?? null, // ✅ worker images
      userId: userId ?? null, // ✅ site-manager images
      siteId,
      url: resolvedPublicUrl,
      fileUrl: resolvedPublicUrl,
      comment: prefixedComment,
      location: null,
      date: new Date(),
    });

    if (acknowledgeSavedPhoto) {
      await sendMessage(to, "✅");
    }

    return { outcome: "photo_saved", savedPhoto };
  } catch (e) {
    console.error("❌ [handleImage] error:", e);
    await sendMessage(to, "Sorry, we couldn't process your image.");
    return { outcome: "error" };
  }
}

function findFirstImageIndex(formData: FormData, numMedia: number) {
  for (let i = 0; i < numMedia; i++) {
    const ct = (
      getString(formData, `MediaContentType${i}`) || ""
    ).toLowerCase();
    if (ct.startsWith("image/")) return i;
  }
  return -1;
}
