import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { exchangeBisAuthorizationCode, upsertUserBisToken } from "@/server/actions/BIS/service";

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

  const cookieStore = await cookies();
  const savedState = cookieStore.get("bis_oauth_state")?.value;
  const returnTo = cookieStore.get("bis_oauth_return_to")?.value || "/dashboard/settings";
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  const cookieDomain = resolveBisCookieDomain(request.nextUrl.hostname);

  cookieStore.delete({
    name: "bis_oauth_state",
    path: "/",
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  cookieStore.delete({
    name: "bis_oauth_return_to",
    path: "/",
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });

  const redirectUrl = new URL(returnTo, request.nextUrl.origin);

  if (error) {
    redirectUrl.searchParams.set("bis", "error");
    redirectUrl.searchParams.set("message", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!savedState || !state || savedState !== `${user.id}:${state}` || !code) {
    redirectUrl.searchParams.set("bis", "error");
    redirectUrl.searchParams.set("message", "invalid-state");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const tokens = await exchangeBisAuthorizationCode(code);
    await upsertUserBisToken(user.id, tokens.access_token, tokens.refresh_token);

    redirectUrl.searchParams.set("bis", "connected");
    return NextResponse.redirect(redirectUrl);
  } catch (cause) {
    redirectUrl.searchParams.set("bis", "error");
    redirectUrl.searchParams.set(
      "message",
      cause instanceof Error ? cause.message : "token-exchange-failed",
    );
    return NextResponse.redirect(redirectUrl);
  }
}
