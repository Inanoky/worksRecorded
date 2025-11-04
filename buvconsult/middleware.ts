// middleware.ts
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default withAuth(async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  

  // Try to capture siteId from URLs like: /dashboard/sites/<siteId>/...
  const match = pathname.match(/^\/dashboard\/sites\/([^/]+)(?:\/|$)/);
  const siteId = match?.[1];

  console.log("MW siteId =", siteId);

  if (siteId === "new"){
    return NextResponse.next()


  }

  

  // Example: If siteId exists but we want to early-block when it’s obviously invalid format:
  if (siteId && !/^[0-9a-fA-F\-]{36}$/.test(siteId)) {
    // Optionally: redirect to 404 or block
    return NextResponse.rewrite(new URL("/404", req.url));
  }

  // Let request proceed
  return NextResponse.next();
}, {
  loginPage: "/api/auth/login",
  isReturnToCurrentPage: true,
});

export const config = {
  matcher: ["/dashboard/:path*"],
};