import { UTApi } from "uploadthing/server";
import { savePhoto } from "@/app/photoActions";
import { getString, fetchTwilioMediaAsBuffer } from "@/app/utils/Whatsapp/shared/helpers";
import { sendMessage } from "@/app/utils/Whatsapp/shared/twillio";
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
  user: any;
  to: string | null;
  body: string;
  agent: AgentFn; // <- accepted but not used now
}): Promise<boolean> {
  const { formData, numMedia, user, to, body } = args;

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
      userId: user.id,
      siteId: user.lastSelectedSiteIdforWhatsapp,
      url: publicUrl,
      fileUrl: publicUrl,
      comment: body || null,
      location: null,
      date: new Date(),
    });

    await sendMessage(to, publicUrl);
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
