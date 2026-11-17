// middleware.ts
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

type AuthMiddleware = (req: NextRequest) => Promise<NextResponse>;

const dashboardMiddleware = withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const match = pathname.match(/^\/dashboard\/sites\/([^/]+)(?:\/|$)/);
    const siteId = match?.[1];

    if (siteId === "new") return NextResponse.next();

    if (siteId && !/^[0-9a-fA-F-]{36}$/.test(siteId)) {
      return NextResponse.rewrite(new URL("/404", req.url));
    }

    return NextResponse.next();
  },
  {
    loginPage: "/api/auth/login",
    isReturnToCurrentPage: true,
  },
) as AuthMiddleware;

const intlMiddleware = createIntlMiddleware({
  locales: ["lv", "en", "ru"],
  defaultLocale: "lv",
});

const publicEntryMiddleware = withAuth({
  publicPaths: ["/", "/lv", "/en", "/ru", "/api/bis/callback"],
}) as AuthMiddleware;

function privateResponse(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.append("Vary", "Cookie");
  return response;
}

async function refreshEntrySession(req: NextRequest): Promise<NextResponse> {
  const hasSessionCookies = req.cookies
    .getAll()
    .some(
      ({ name, value }) =>
        value &&
        /^(?:(?:access_token|id_token)\d*|refresh_token(?:_[A-Za-z0-9]+)?)$/.test(
          name,
        ),
    );
  if (!hasSessionCookies) return NextResponse.next();
  try {
    return await publicEntryMiddleware(req);
  } catch {
    return NextResponse.next();
  }
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect dashboard
  if (pathname.startsWith("/dashboard")) {
    return dashboardMiddleware(req);
  }

  // Let BIS OAuth callbacks on the root path reach the callback handler before locale redirects.
  if (pathname === "/") {
    const hasBisAuthParams =
      req.nextUrl.searchParams.has("code") ||
      req.nextUrl.searchParams.has("state") ||
      req.nextUrl.searchParams.has("error");

    if (hasBisAuthParams) {
      const callbackUrl = new URL("/api/bis/callback", req.url);
      callbackUrl.search = req.nextUrl.search;
      const sessionResponse = await refreshEntrySession(req);
      const response = NextResponse.redirect(callbackUrl, 307);
      for (const cookie of sessionResponse.cookies.getAll()) {
        response.cookies.set(cookie);
      }
      return privateResponse(response);
    }
  }

  if (
    pathname === "/" ||
    /^\/(?:lv|en|ru)\/?$/.test(pathname) ||
    pathname === "/api/bis/callback"
  ) {
    return privateResponse(await refreshEntrySession(req));
  }

  if (/^\/(?:lv|en|ru)\/Landing\/?$/.test(pathname)) {
    const sessionResponse = await refreshEntrySession(req);
    if (sessionResponse.headers.has("location")) {
      return privateResponse(sessionResponse);
    }
    const headers = new Headers(req.headers);
    const refreshedCookies = sessionResponse.headers.get(
      "x-middleware-request-cookie",
    );
    if (refreshedCookies !== null) headers.set("cookie", refreshedCookies);
    const response = intlMiddleware(new NextRequest(req, { headers }));
    for (const cookie of sessionResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }
    return privateResponse(response);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/",
    "/(en|lv|ru)/:path*",
    "/dashboard/:path*",
    "/api/bis/callback",
  ],
};
