
import { UTApi } from "uploadthing/server";
import { savePhoto } from "@/server/actions/site-diary-actions";
import { getString, fetchTwilioMediaAsBuffer } from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage } from "@/lib/utils/whatsapp-helpers/shared/twillio";
import { AgentFn } from "./types";

const utapi = new UTApi();

/**
 * Try to handle the first image in the payload.
 * Currently does NOT call the agent, but we accept it for future use.
 * Returns true if handled, false if no image present.
 */
export async function handleImage(args: {
  formData: FormData;
  numMedia: number;
  userId: string | null;      // ✅ allow userId for site manager route
  workerId?: string | null;   // ✅ optional workerId for worker route
  siteId: string;
  to: string | null;
  body: string;
  agent: AgentFn;
}): Promise<boolean> {
  const { formData, numMedia, workerId, siteId, to, body, userId } = args;

  const idx = findFirstImageIndex(formData, numMedia);
  if (idx < 0) return false;

  const mediaUrl = getString(formData, `MediaUrl${idx}`);
  const contentType = (getString(formData, `MediaContentType${idx}`) || "image/jpeg").toLowerCase();

  try {
    const buf = await fetchTwilioMediaAsBuffer(mediaUrl!);

    const ext = contentType.split("/")[1] || "jpg";
    const fileName = `whatsapp_${Date.now()}.${ext}`;
    const file = new File([buf], fileName, { type: contentType });

    const uploaded = await utapi.uploadFiles([file]);
    const first = Array.isArray(uploaded) ? uploaded[0] : uploaded;

    if (first?.error || !first?.data) {
      await sendMessage(to, "Sorry, failed to store the image.");
      return true;
    }

    const publicUrl = first.data.ufsUrl ?? first.data.url;

    await savePhoto({
      workerId: workerId ?? null, // ✅ worker images
      userId: userId ?? null,     // ✅ site-manager images
      siteId,
      url: publicUrl,
      fileUrl: publicUrl,
      comment: body || null,
      location: null,
      date: new Date(),
    });

    await sendMessage(to, "Bilde saglabāta");
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