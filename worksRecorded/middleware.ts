// middleware.ts
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

const dashboardMiddleware = withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const match = pathname.match(/^\/dashboard\/sites\/([^/]+)(?:\/|$)/);
    const siteId = match?.[1];

    if (siteId === "new") return NextResponse.next();

    if (siteId && !/^[0-9a-fA-F\-]{36}$/.test(siteId)) {
      return NextResponse.rewrite(new URL("/404", req.url));
    }

    return NextResponse.next();
  },
  {
    loginPage: "/api/auth/login",
    isReturnToCurrentPage: true,
  }
);

const intlMiddleware = createIntlMiddleware({
  locales: ["en", "lv"],
  defaultLocale: "en",
});

export default function middleware(req: NextRequest) {
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
      req.nextUrl.searchParams.forEach((value, key) => {
        callbackUrl.searchParams.set(key, value);
      });
      return NextResponse.redirect(callbackUrl);
    }

    return NextResponse.redirect(new URL("/en/Landing", req.url));
  }

  // Redirect /en or /lv to /<locale>/Landing
  const m = pathname.match(/^\/(en|lv)\/?$/);
  if (m) {
    const locale = m[1];
    return NextResponse.redirect(new URL(`/${locale}/Landing`, req.url));
  }

  return intlMiddleware(req);
}


export const config = {
  matcher: ["/", "/(en|lv)/:path*", "/dashboard/:path*"],
};
