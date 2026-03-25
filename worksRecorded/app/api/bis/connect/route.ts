import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import {
  getBisAuthorizeUrl,
} from "@/server/actions/BIS/service";

function resolveBisCookieDomain(hostname: string) {
  return hostname === "worksrecorded.com" || hostname.endsWith(".worksrecorded.com")
    ? ".worksrecorded.com"
    : undefined;
}

export async function GET(request: NextRequest) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/api/auth/login", request.nextUrl.origin));
  }

  const siteId = request.nextUrl.searchParams.get("siteId");
  const returnTo =
    request.nextUrl.searchParams.get("returnTo") ||
    (siteId ? `/dashboard/sites/${siteId}/settings` : "/dashboard/settings");

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  const cookieDomain = resolveBisCookieDomain(request.nextUrl.hostname);

  cookieStore.set("bis_oauth_state", `${user.id}:${state}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(cookieDomain ? { domain: cookieDomain } : {}),
    path: "/",
    maxAge: 60 * 10,
  });
  cookieStore.set("bis_oauth_return_to", returnTo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(cookieDomain ? { domain: cookieDomain } : {}),
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(getBisAuthorizeUrl(state));
}
