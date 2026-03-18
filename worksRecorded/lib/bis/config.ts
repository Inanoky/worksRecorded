export const BIS_BASE_URL = process.env.BIS_BASE_URL ?? "https://test.bis.gov.lv";
export const BIS_SCOPE = process.env.BIS_SCOPE ?? "bis_case_documents:manage logbooks:manage";
export const BIS_CLIENT_ID = process.env.BIS_CLIENT_ID ?? "";
export const BIS_CLIENT_SECRET = process.env.BIS_CLIENT_SECRET ?? "";
export const BIS_REDIRECT_URI =
  process.env.BIS_REDIRECT_URI ??
  `${process.env.NODE_ENV === "production" ? "https://buvconsult.com" : "http://localhost:3000"}/api/bis/oauth/callback`;

export function requireBisOAuthConfig() {
  if (!BIS_CLIENT_ID || !BIS_CLIENT_SECRET) {
    throw new Error("Missing BIS OAuth configuration. Set BIS_CLIENT_ID and BIS_CLIENT_SECRET.");
  }

  return {
    baseUrl: BIS_BASE_URL,
    clientId: BIS_CLIENT_ID,
    clientSecret: BIS_CLIENT_SECRET,
    redirectUri: BIS_REDIRECT_URI,
    scope: BIS_SCOPE,
  };
}
