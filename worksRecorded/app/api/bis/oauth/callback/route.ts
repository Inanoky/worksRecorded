import { NextResponse } from "next/server";
import { prisma } from "@/lib/utils/db";
import { BIS_BASE_URL, requireBisOAuthConfig } from "@/lib/bis/config";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/dashboard?bis=error`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard?bis=missing_code`);
  }

  const { clientId, clientSecret, redirectUri } = requireBisOAuthConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${BIS_BASE_URL}/bisp/api/auth/oauth2.0/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  const json = await response.json();
  if (!response.ok || !json?.access_token || !json?.refresh_token) {
    return NextResponse.redirect(`${origin}/dashboard?bis=token_error`);
  }

  const latest = await prisma.bisToken.findFirst({ orderBy: { updatedAt: "desc" } });
  if (latest) {
    await prisma.bisToken.update({ where: { id: latest.id }, data: { accessToken: json.access_token, refreshToken: json.refresh_token } });
  } else {
    await prisma.bisToken.create({ data: { accessToken: json.access_token, refreshToken: json.refresh_token } });
  }

  return NextResponse.redirect(`${origin}/dashboard?bis=connected`);
}
