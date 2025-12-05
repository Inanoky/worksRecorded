"use server"

import { prisma } from "@/lib/utils/db";
import { Resend } from "resend";







const ORG_CODE = "org_ed664b1eedd";

// NOTE: don't log your API key
const hasKey = Boolean(process.env.RESEND_API_KEY);
if (!hasKey) {
  console.warn("[inviteUserByEmail] RESEND_API_KEY is missing in env.");
}

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an org-scoped Kinde signup link to the given email.
 * Adds debug logs for troubleshooting.
 */
export async function inviteUserByEmail(formData: FormData) {
  try {
    const emailRaw = formData.get("email");
    console.log("[inviteUserByEmail] raw email from formData:", emailRaw);

    const email = String(emailRaw || "").trim().toLowerCase();
    if (!email) {
      console.warn("[inviteUserByEmail] missing email");
      return { ok: false, message: "Email is required" };
    }

    const link = `https://buvconsult.com/api/auth/register?org_code=${ORG_CODE}&login_hint=${encodeURIComponent(
      email
    )}`;

    console.log("[inviteUserByEmail] prepared link:", link);
    console.log("[inviteUserByEmail] from domain:", "no-reply@buvconsult.com");
    console.log("[inviteUserByEmail] has RESEND_API_KEY:", hasKey);

    // TIP: Resend requires a verified sending domain (DNS DKIM set up).
    // If domain isn't verified, you'll typically get 403 or a descriptive error.

    const result = await resend.emails.send({
      from: 'BUVCONSULT <invite@no-reply.buvconsult.com>',
      to: email,
      subject: "BUVCONSULT – Invitation to join",
      html: `
        <p>You have been invited to join <b>BUVCONSULT</b>.</p>
        <p><a href="${link}">Click here to create your account</a></p>
        <p>If the button does not work, copy and paste this link:</p>
        <p>${link}</p>
      `,
    });

    // Resend returns `{ id?: string, error?: any }`
    console.log("[inviteUserByEmail] resend.emails.send() result:", result);

    if ((result as any)?.error) {
      console.error("[inviteUserByEmail] Resend error payload:", (result as any).error);
      return {
        ok: false,
        message:
          (result as any).error?.message ||
          (result as any).error ||
          "Resend returned an error",
      };
    }

    const messageId = (result as any)?.id ?? "(no id)";
    console.log("[inviteUserByEmail] email queued successfully. id:", messageId);

    return { ok: true };
  } catch (err: any) {
    // Log as much as possible without leaking secrets
    console.error("[inviteUserByEmail] exception name:", err?.name);
    console.error("[inviteUserByEmail] exception message:", err?.message);
    console.error("[inviteUserByEmail] exception stack:", err?.stack);

    // Some SDK/network libs expose response details like this:
    if (err?.status) console.error("[inviteUserByEmail] http status:", err.status);
    if (err?.response) {
      try {
        const body = await err.response.text?.();
        console.error("[inviteUserByEmail] http response body:", body);
      } catch {
        // ignore if not readable
      }
    }

    return { ok: false, message: err?.message ?? "Failed to send email" };
  }
}



export async function getUserData(orgId){


   const users = await prisma.user.findMany({

        where: {organizationId : orgId},
        select: {
            id: true,
            email : true,
            firstName : true,
            lastName : true,
            phone : true,
            role : true,
            status: true,
            reminderTime: true,
            remindersEnabled: true

        }
    })

    return  users


}

export async function editUserData( id, data){


    await prisma.user.update({

        where: {id },
        data
        
    })

    return  "Success"


}


export async function saveTemporaryUser(email: string, organizationId: string) {
  console.log("[saveTemporaryUser] called with:", { email, organizationId });

  try {
    await prisma.user.create({
      data: {

        id: crypto.randomUUID(),       
        email: email,
        firstName: "",           // placeholder
        lastName: "",            // placeholder
        profileImage: "",        // placeholder
        organizationId: organizationId,
        status: "pending",
      },
    });

    console.log("[saveTemporaryUser] success:", { email, organizationId });
    return { ok: true };
  } catch (e: any) {
    console.log("[saveTemporaryUser] error:", e?.message);
    return { ok: false, message: e?.message ?? "Failed to save temporary user" };
  }
}