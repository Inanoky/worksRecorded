import { createHash } from "crypto";

import { prisma } from "@/lib/utils/db";
import { clockInWorker, isWorkerClockedIn } from "@/server/actions/timesheets-actions";
import {
  isPointInsidePolygon,
  parseGeofencePolygon,
  verifyClockInToken,
} from "@/lib/utils/clock-in-link";

const CLOCKIN_SESSION_COOKIE = "clockin_session";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function readCookie(req: Request, key: string): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const items = cookieHeader.split(";").map((item) => item.trim());
  const prefix = `${key}=`;
  const match = items.find((item) => item.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

async function sendMetaTextFromRouteNumber(args: {
  businessPhoneNumberId: string;
  toPhone: string;
  body: string;
}) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return;
  const to = args.toPhone.replace(/^whatsapp:/i, "").replace(/\D/g, "");
  if (!to) return;

  await fetch(`https://graph.facebook.com/v18.0/${args.businessPhoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      text: { body: args.body },
    }),
  });
}

async function getWaMeUrlForMetaRouteNumber(businessPhoneNumberId: string): Promise<string | null> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return null;

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${businessPhoneNumberId}?fields=display_phone_number`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  const digits = (data?.display_phone_number || "").toString().replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const challengeId = typeof body?.challengeId === "string" ? body.challengeId : "";
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    const payload = verifyClockInToken(token);
    if (!payload) {
      return Response.json({ ok: false, message: "Invalid or expired clock-in link." }, { status: 400 });
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return Response.json({ ok: false, message: "Invalid coordinates." }, { status: 400 });
    }

    const sessionCookie = readCookie(req, CLOCKIN_SESSION_COOKIE);
    if (!sessionCookie || !challengeId) {
      return Response.json(
        { ok: false, message: "Clock-in session is missing. Reopen the link from WhatsApp." },
        { status: 400 }
      );
    }

    const challenge = await prisma.clockInChallenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        workerId: true,
        siteId: true,
        tokenHash: true,
        sessionHash: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!challenge) {
      return Response.json(
        { ok: false, message: "Clock-in challenge was not found. Reopen link from WhatsApp." },
        { status: 400 }
      );
    }
    if (challenge.usedAt) {
      return Response.json(
        { ok: false, message: "This clock-in challenge was already used." },
        { status: 400 }
      );
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      return Response.json(
        { ok: false, message: "Clock-in challenge expired. Reopen link from WhatsApp." },
        { status: 400 }
      );
    }
    if (challenge.workerId !== payload.workerId || challenge.siteId !== payload.siteId) {
      return Response.json(
        { ok: false, message: "Challenge does not match this worker/site." },
        { status: 400 }
      );
    }
    if (challenge.tokenHash !== sha256(token) || challenge.sessionHash !== sha256(sessionCookie)) {
      return Response.json(
        { ok: false, message: "Session mismatch. Reopen link from WhatsApp on this phone." },
        { status: 400 }
      );
    }

    const worker = await prisma.workers.findUnique({
      where: { id: payload.workerId },
      include: {
        Site: {
          select: { name: true, geofencePolygon: true },
        },
      },
    });
    const businessPhoneNumberId = payload.businessPhoneNumberId || "";
    const redirectUrl = businessPhoneNumberId
      ? await getWaMeUrlForMetaRouteNumber(businessPhoneNumberId)
      : null;

    if (!worker || !worker.siteId || worker.siteId !== payload.siteId || !worker.Site) {
      return Response.json({ ok: false, message: "Worker or site assignment not found." }, { status: 404 });
    }

    const geofence = parseGeofencePolygon(worker.Site.geofencePolygon);
    if (geofence.length < 3) {
      return Response.json({ ok: false, message: "Site geofence is not configured." }, { status: 400 });
    }

    const inside = isPointInsidePolygon({ lat: latitude, lng: longitude }, geofence);
    if (!inside) {
      return Response.json(
        { ok: false, message: "You are outside site area. Please enter site and try again." },
        { status: 400 }
      );
    }

    const clockStatus = await isWorkerClockedIn(worker.id);
    if (clockStatus.success && clockStatus.isClockedIn) {
      return Response.json({ ok: true, message: "You are already clocked in.", redirectUrl });
    }

    const markUsed = await prisma.clockInChallenge.updateMany({
      where: {
        id: challenge.id,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
    if (markUsed.count === 0) {
      return Response.json(
        { ok: false, message: "Clock-in challenge already used. Reopen link from WhatsApp." },
        { status: 400 }
      );
    }

    const now = new Date();
    const result = await clockInWorker({
      workerId: worker.id,
      siteId: worker.siteId,
      date: now,
      clockIn: now,
    });

    if (!result.success) {
      return Response.json({ ok: false, message: `Clock-in failed: ${result.error ?? "Unknown error"}` }, { status: 500 });
    }

    const workerTo = worker.phone
      ? worker.phone.startsWith("whatsapp:")
        ? worker.phone
        : `whatsapp:${worker.phone}`
      : null;
    if (businessPhoneNumberId && workerTo) {
      await sendMetaTextFromRouteNumber({
        businessPhoneNumberId,
        toPhone: workerTo,
        body: `✅ Clock-in successful at ${worker.Site.name}.`,
      });
    }

    return Response.json({
      ok: true,
      message: `Clock-in successful at ${worker.Site.name}. Returning to WhatsApp...`,
      redirectUrl,
    });
  } catch (error) {
    console.error("clock-in verify route error", error);
    return Response.json({ ok: false, message: "Unexpected server error." }, { status: 500 });
  }
}
