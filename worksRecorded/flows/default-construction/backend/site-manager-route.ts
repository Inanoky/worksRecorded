import {
  getRandomSiteManagerProcessingAcknowledgement,
  getSiteManagerPhotoSaveSummary,
} from "@/flows/default-construction/backend/site-manager-acknowledgements";
import talkToWhatsappAgent from "@/flows/default-construction/backend/site-manager-agent/agent";
import {
  buildSiteManagerSenderTraceContext,
  getSiteManagerAgentRunContext,
  runWithSiteManagerAgentEvalContext,
  setSiteManagerSenderTraceContext,
} from "@/flows/default-construction/backend/site-manager-agent/runContext";
import { prisma } from "@/lib/utils/db"; // ⬅️ need prisma
import { handleAudio } from "@/lib/utils/whatsapp-helpers/shared/handleAudio";
import { handleImage } from "@/lib/utils/whatsapp-helpers/shared/handleImage";
import { handleText } from "@/lib/utils/whatsapp-helpers/shared/handleText";
import { getString } from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { handleProjectSelector } from "@/lib/utils/whatsapp-helpers/shared/projectSelector";
import { sendMessage } from "@/lib/utils/whatsapp-helpers/shared/sender";
import type { AgentFn } from "@/lib/utils/whatsapp-helpers/shared/types";
import { processMaterialDocumentImageFromPublicUrl } from "@/server/actions/META/RoutingHandlers/metaImageHandler";
import { getUserFirstNameById } from "@/server/actions/whatsapp-actions";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";

const currentAgent: AgentFn = async (input, siteId, userId, originalAudioUrl) =>
  (await talkToWhatsappAgent(input, siteId, userId, originalAudioUrl)) ?? "";

function buildTraceAwareAgent(user: any): AgentFn {
  const senderTraceContext = buildSiteManagerSenderTraceContext({
    firstName: user?.firstName,
    lastName: user?.lastName,
  });

  return async (input, siteId, userId, originalAudioUrl) => {
    if (getSiteManagerAgentRunContext()) {
      setSiteManagerSenderTraceContext(senderTraceContext);
      return currentAgent(input, siteId, userId, originalAudioUrl);
    }

    const run = await runWithSiteManagerAgentEvalContext(
      senderTraceContext,
      () => currentAgent(input, siteId, userId, originalAudioUrl),
    );
    return run.result;
  };
}

async function resolveOrganizationLanguage(userId: string) {
  try {
    return await getOrganizationLanguageByUserId(userId);
  } catch (error) {
    console.error("Site manager organization language lookup failed", error);
    return "en";
  }
}

async function sendProcessingAcknowledgement(
  to: string | null,
  userId: string,
) {
  if (!to) return;
  const organizationLanguage = await resolveOrganizationLanguage(userId);

  try {
    await sendMessage(
      to,
      getRandomSiteManagerProcessingAcknowledgement(organizationLanguage),
    );
  } catch (error) {
    console.error("Site manager processing acknowledgement failed", error);
  }
}

function findImageIndexes(formData: FormData, numMedia: number) {
  const indexes: number[] = [];
  for (let index = 0; index < numMedia; index += 1) {
    const contentType = (
      getString(formData, `MediaContentType${index}`) || ""
    ).toLowerCase();
    if (contentType.startsWith("image/")) indexes.push(index);
  }
  return indexes;
}

export async function handleSiteManagerRoute(args: {
  from: string | null;
  formData: FormData;
  user: any;
}) {
  const { from, formData, user } = args;

  const userName = await getUserFirstNameById(user.id);
  const traceAwareAgent = buildTraceAwareAgent(user);

  const body = (getString(formData, "Body") || "").trim();
  const numMedia = parseInt(getString(formData, "NumMedia") || "0", 10) || 0;

  // 1) Project selector can reply & exit early
  const handledSelection = await handleProjectSelector({
    user,
    body,
    to: from,
    username: userName,
  });
  if (handledSelection) return;

  // 2) Check if schema exists for selected site
  if (!user.lastSelectedSiteIdforWhatsapp) {
    await sendMessage(
      from,
      `Hello ${userName}! Please first select a project. Type "Change", "Project", or "Projekts" to see the project list.`,
    );
    return;
  }

  const settings = await prisma.sitediarysettings.findUnique({
    where: { siteId: user.lastSelectedSiteIdforWhatsapp },
  });

  if (!settings || !settings.schema) {
    await sendMessage(
      from,
      `Hello ${userName}! Please first upload site schema in the project settings menu. Contact project admin.`,
    );
    return;
  }

  // 3) Media path
  if (numMedia > 0) {
    const imageIndexes = findImageIndexes(formData, numMedia);
    const collectedBatchSize =
      Number(getString(formData, "MetaBatchSize") || "0") || 0;

    if (collectedBatchSize > 0 && imageIndexes.length > 0) {
      let savedCount = 0;
      const savedCaptions: Array<{
        body: string;
        messageId: string | null;
        photoId: string | null;
      }> = [];

      for (const [batchPosition, imageIndex] of imageIndexes.entries()) {
        const mediaBodyKey = `MediaBody${imageIndex}`;
        const imageBody = (
          formData.has(mediaBodyKey)
            ? getString(formData, mediaBodyKey) || ""
            : batchPosition === 0
              ? body
              : ""
        ).trim();
        const img = await handleImage({
          formData,
          numMedia,
          imageIndex,
          siteId: user.lastSelectedSiteIdforWhatsapp,
          userId: user.id,
          workerId: null,
          to: from,
          body: imageBody,
          photographerName: [user.firstName, user.lastName]
            .filter(Boolean)
            .join(" "),
          acknowledgeSavedPhoto: false,
          onUploadedImage: async ({ publicUrl }) => {
            try {
              const handledAsMaterialDocument =
                await processMaterialDocumentImageFromPublicUrl({
                  publicUrl,
                  senderPhone: user.phone ?? from,
                  senderFirstName: user.firstName,
                  senderLastName: user.lastName,
                });

              if (handledAsMaterialDocument) {
                await sendMessage(
                  from,
                  "✅ Materiālu dokuments saņemts. Materiāli tika izvilkti un saglabāti.",
                );
                return true;
              }
            } catch (error) {
              console.error(
                "Materiālu dokumenta atpazīšana neizdevās, saglabāju kā parastu fotoattēlu.",
                error,
              );
            }

            return false;
          },
        });

        if (img && img.outcome === "photo_saved") {
          savedCount += 1;
          if (imageBody) {
            savedCaptions.push({
              body: imageBody,
              messageId:
                getString(formData, `MediaMessageId${imageIndex}`) || null,
              photoId: img.savedPhoto?.id ?? null,
            });
          }
        }
      }

      const organizationLanguage = await resolveOrganizationLanguage(user.id);
      await sendMessage(
        from,
        getSiteManagerPhotoSaveSummary(
          savedCount,
          imageIndexes.length,
          organizationLanguage,
        ),
      );

      for (const caption of savedCaptions) {
        console.log("Site manager batched image caption processing started", {
          messageId: caption.messageId,
          photoId: caption.photoId,
          siteId: user.lastSelectedSiteIdforWhatsapp,
        });
        const agentInvocationSucceeded = await handleText({
          body: caption.body,
          user,
          to: from,
          agent: traceAwareAgent,
        });
        console.log("Site manager batched image caption processing finished", {
          messageId: caption.messageId,
          photoId: caption.photoId,
          agentInvocationSucceeded,
        });
      }
      return;
    }

    const img = await handleImage({
      formData,
      numMedia,
      siteId: user.lastSelectedSiteIdforWhatsapp,
      userId: user.id, // ✅ used inside savePhoto as userId
      workerId: null, // ✅ make sure org lookup uses userId path
      to: from,
      body,
      photographerName: [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" "),
      acknowledgeSavedPhoto: false,
      onUploadedImage: async ({ publicUrl }) => {
        try {
          const handledAsMaterialDocument =
            await processMaterialDocumentImageFromPublicUrl({
              publicUrl,
              senderPhone: user.phone ?? from,
              senderFirstName: user.firstName,
              senderLastName: user.lastName,
            });

          if (handledAsMaterialDocument) {
            await sendMessage(
              from,
              "✅ Materiālu dokuments saņemts. Materiāli tika izvilkti un saglabāti.",
            );
            return true;
          }
        } catch (error) {
          console.error(
            "Materiālu dokumenta atpazīšana neizdevās, saglabāju kā parastu fotoattēlu.",
            error,
          );
        }

        return false;
      },
    });
    if (img) {
      if (img.outcome === "photo_saved") {
        const normalizedComment = body.trim();
        const messageId = getString(formData, "MessageId") || null;

        if (!normalizedComment) {
          await sendMessage(from, "✅");
          return;
        }

        console.log("Site manager image caption processing started", {
          messageId,
          photoId: img.savedPhoto?.id ?? null,
          siteId: user.lastSelectedSiteIdforWhatsapp,
        });
        await sendProcessingAcknowledgement(from, user.id);
        const agentInvocationSucceeded = await handleText({
          body: normalizedComment,
          user,
          to: from,
          agent: traceAwareAgent,
        });
        console.log("Site manager image caption processing finished", {
          messageId,
          photoId: img.savedPhoto?.id ?? null,
          agentInvocationSucceeded,
        });
      }
      return;
    }

    const mediaContentType0 = (
      getString(formData, "MediaContentType0") || ""
    ).toLowerCase();
    if (mediaContentType0.startsWith("audio")) {
      await sendProcessingAcknowledgement(from, user.id);
    }
    const aud = await handleAudio({
      formData,
      user,
      to: from,
      agent: traceAwareAgent,
    });
    if (aud) return;

    await sendMessage(from, "Received your message!");
    return;
  }

  // 4) Text-only
  if (body) {
    await sendProcessingAcknowledgement(from, user.id);
  }
  await handleText({ body, user, to: from, agent: traceAwareAgent });
}
