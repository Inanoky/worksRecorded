
import { UTApi } from "uploadthing/server";
import { savePhoto } from "@/server/actions/site-diary-actions";
import { getString, fetchWhatsAppMediaAsBuffer } from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage } from "@/lib/utils/whatsapp-helpers/shared/sender";
import { AgentFn } from "./types";
import { getUploadThingFileUrl } from "@/lib/utils/uploadthing-file-url";

export type UploadedImageContext = {
  publicUrl: string;
  contentType: string;
  body: string;
  to: string | null;
  formData: FormData;
};

const utapi = new UTApi();

/**
 * Try to handle the first image in the payload.
 * Currently does NOT call the agent, but we accept it for future use.
 * Returns true if handled, false if no image present.
 */
export async function handleImage(args: {
  formData: FormData;
  numMedia: number;
  userId?: string | null;     // ✅ allow userId for site manager route
  workerId?: string | null;   // ✅ optional workerId for worker route
  siteId: string;
  to: string | null;
  body: string;
  photographerName?: string | null;
  agent: AgentFn;
  onUploadedImage?: (context: UploadedImageContext) => Promise<boolean>;
}): Promise<boolean> {
  const { formData, numMedia, workerId, siteId, to, body, userId, photographerName, onUploadedImage } = args;

  const idx = findFirstImageIndex(formData, numMedia);
  if (idx < 0) return false;

  const mediaUrl = getString(formData, `MediaUrl${idx}`);
  const contentType = (getString(formData, `MediaContentType${idx}`) || "image/jpeg").toLowerCase();

  try {
    const buf = await fetchWhatsAppMediaAsBuffer(mediaUrl!);

    const ext = contentType.split("/")[1] || "jpg";
    const fileName = `whatsapp_${Date.now()}.${ext}`;
    const file = new File([buf], fileName, { type: contentType });

    const uploaded = await utapi.uploadFiles([file]);
    const first = Array.isArray(uploaded) ? uploaded[0] : uploaded;

    if (first?.error || !first?.data) {
      await sendMessage(to, "Sorry, failed to store the image.");
      return true;
    }

    const publicUrl = getUploadThingFileUrl(first.data);

    if (!publicUrl) {
      await sendMessage(to, "Sorry, failed to store the image.");
      return true;
    }

    if (onUploadedImage) {
      const wasHandled = await onUploadedImage({
        publicUrl,
        contentType,
        body,
        to,
        formData,
      });

      if (wasHandled) return true;
    }

    const trimmedBody = body.trim();
    const trimmedPhotographerName = photographerName?.trim() ?? "";
    const prefixedComment = trimmedPhotographerName
      ? trimmedBody
        ? `${trimmedPhotographerName} : ${trimmedBody}`
        : trimmedPhotographerName
      : trimmedBody || null;

    await savePhoto({
      workerId: workerId ?? null, // ✅ worker images
      userId: userId ?? null,     // ✅ site-manager images
      siteId,
      url: publicUrl,
      fileUrl: publicUrl,
      comment: prefixedComment,
      location: null,
      date: new Date(),
    });

    await sendMessage(to, "✅");
  } catch (e) {
    console.error("❌ [handleImage] error:", e);
    await sendMessage(to, "Sorry, we couldn't process your image.");
  }
  return true;
}

function findFirstImageIndex(formData: FormData, numMedia: number) {
  for (let i = 0; i < numMedia; i++) {
    const ct = (getString(formData, `MediaContentType${i}`) || "").toLowerCase();
    if (ct.startsWith("image/")) return i;
  }
  return -1;
}
