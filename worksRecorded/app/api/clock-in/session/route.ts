import { randomUUID, createHash } from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/utils/db";
import { verifyClockInToken } from "@/lib/utils/clock-in-link";

const CLOCKIN_SESSION_COOKIE = "clockin_session";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const payload = verifyClockInToken(token);

    if (!payload) {
      return NextResponse.json(
        { ok: false, message: "Invalid or expired clock-in link." },
        { status: 400 }
      );
    }

    const now = new Date();
    const tokenExpiry = new Date(payload.exp * 1000);
    const challengeExpiry = new Date(
      Math.min(tokenExpiry.getTime(), now.getTime() + 2 * 60 * 1000)
    );

    const sessionSecret = randomUUID();
    const sessionHash = sha256(sessionSecret);
    const tokenHash = sha256(token);

    const challenge = await prisma.clockInChallenge.create({
      data: {
        workerId: payload.workerId,
        siteId: payload.siteId,
        tokenHash,
        sessionHash,
        expiresAt: challengeExpiry,
      },
      select: { id: true, expiresAt: true },
    });

    const response = NextResponse.json({
      ok: true,
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt.toISOString(),
    });

    response.cookies.set(CLOCKIN_SESSION_COOKIE, sessionSecret, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      expires: challengeExpiry,
    });

    return response;
  } catch (error) {
    console.error("clock-in session route error", error);
    return NextResponse.json(
      { ok: false, message: "Unexpected server error." },
      { status: 500 }
    );
  }
}
