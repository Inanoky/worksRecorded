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

  // FORCE default language to EN on root
  if (pathname === "/") {
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
