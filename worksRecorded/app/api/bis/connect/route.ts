import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import {
  getBisBaseUrl,
  getBisClientId,
  getBisRedirectUri,
  getBisScopes,
} from "@/server/actions/BIS/service";

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
  cookieStore.set("bis_oauth_state", `${user.id}:${state}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  cookieStore.set("bis_oauth_return_to", returnTo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  const authorizeUrl = new URL(`${getBisBaseUrl()}/bisp/api/auth/oauth2.0/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", getBisClientId());
  authorizeUrl.searchParams.set("redirect_uri", getBisRedirectUri());
  authorizeUrl.searchParams.set("scope", getBisScopes());
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl);
}
