import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";

type UserBisTokenRow = {
  id: string;
  accessToken: string;
  refreshToken: string;
  updatedAt: Date;
  userId: string;
};

type SiteBisConfigRow = {
  id: string;
  bisCaseId: string | null;
  bisCaseNumber: string | null;
  bisCaseName: string | null;
  bisCaseStage: string | null;
};

const BIS_BASE_URL = process.env.BIS_BASE_URL ?? "https://test.bis.gov.lv";
const BIS_SCOPES = process.env.BIS_SCOPES ?? "bis_case_documents:manage logbooks:manage";
const BIS_ACCESS_TOKEN_MAX_AGE_MS = 50 * 60 * 1000;

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

export function getBisClientId() {
  return getRequiredEnv("BIS_CLIENT_ID");
}

export function getBisClientSecret() {
  return getRequiredEnv("BIS_CLIENT_SECRET");
}

export function getBisBaseUrl() {
  return BIS_BASE_URL;
}

export function getBisScopes() {
  return BIS_SCOPES;
}

export function getBisRedirectUri() {
  return process.env.BIS_REDIRECT_URI ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost:3000/";
}

export function getBisAuthorizeUrl(state?: string) {
  const authorizeUrl = new URL(`${getBisBaseUrl()}/bisp/api/auth/oauth2.0/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", getBisClientId());
  authorizeUrl.searchParams.set("redirect_uri", getBisRedirectUri());
  authorizeUrl.searchParams.set("scope", getBisScopes());
  if (state) {
    authorizeUrl.searchParams.set("state", state);
  }
  return authorizeUrl.toString();
}

function getBasicAuthHeader() {
  return `Basic ${Buffer.from(`${getBisClientId()}:${getBisClientSecret()}`).toString("base64")}`;
}

export async function getUserBisTokenByUserId(userId: string) {
  const rows = await prisma.$queryRaw<UserBisTokenRow[]>`
    SELECT id, "accessToken", "refreshToken", "updatedAt", "userId"
    FROM "BisToken"
    WHERE "userId" = ${userId}
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getCurrentUserBisToken() {
  const user = await requireUser();
  return getUserBisTokenByUserId(user.id);
}

function isBisAccessTokenStale(token: UserBisTokenRow) {
  return Date.now() - new Date(token.updatedAt).getTime() >= BIS_ACCESS_TOKEN_MAX_AGE_MS;
}

export async function refreshBisAccessToken(userId: string, refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(`${getBisBaseUrl()}/bisp/api/auth/oauth2.0/token`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  const json = await response.json();

  if (!response.ok || !json?.access_token) {
    throw new Error(json?.error_description || json?.error || "Failed to refresh BIS access token");
  }

  const nextRefreshToken = json?.refresh_token || refreshToken;
  await upsertUserBisToken(userId, json.access_token, nextRefreshToken);

  return {
    accessToken: String(json.access_token),
    refreshToken: String(nextRefreshToken),
  };
}

export async function ensureUserBisAccessToken(userId: string) {
  const token = await getUserBisTokenByUserId(userId);

  if (!token?.refreshToken) {
    return token;
  }

  if (!token.accessToken || isBisAccessTokenStale(token)) {
    const refreshed = await refreshBisAccessToken(userId, token.refreshToken);
    return {
      ...token,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      updatedAt: new Date(),
    };
  }

  return token;
}

export async function upsertUserBisToken(userId: string, accessToken: string, refreshToken: string) {
  await prisma.$executeRaw`DELETE FROM "BisToken" WHERE "userId" = ${userId}`;
  await prisma.$executeRaw`
    INSERT INTO "BisToken" (id, "accessToken", "refreshToken", "updatedAt", "userId")
    VALUES (${crypto.randomUUID()}, ${accessToken}, ${refreshToken}, NOW(), ${userId})
  `;
}

export async function deleteUserBisTokens(userId: string) {
  await prisma.$executeRaw`DELETE FROM "BisToken" WHERE "userId" = ${userId}`;
}

export async function getSiteBisConfig(siteId: string) {
  const rows = await prisma.$queryRaw<SiteBisConfigRow[]>`
    SELECT id, "bisCaseId", "bisCaseNumber", "bisCaseName", "bisCaseStage"
    FROM "Site"
    WHERE id = ${siteId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function setSiteBisConfig(siteId: string, config: Omit<SiteBisConfigRow, "id">) {
  await prisma.$executeRaw`
    UPDATE "Site"
    SET
      "bisCaseId" = ${config.bisCaseId},
      "bisCaseNumber" = ${config.bisCaseNumber},
      "bisCaseName" = ${config.bisCaseName},
      "bisCaseStage" = ${config.bisCaseStage}
    WHERE id = ${siteId}
  `;
}

export async function requireBisAccessTokenForSite(siteId: string) {
  const user = await requireUser();
  const site = await orgCheck(user.id, siteId);

  if (!site) {
    throw new Error("Site not found");
  }

  const token = await ensureUserBisAccessToken(user.id);

  if (!token?.accessToken) {
    throw new Error("BIS is not connected");
  }

  const siteRecord = await getSiteBisConfig(siteId);

  if (!siteRecord?.bisCaseId) {
    throw new Error("BIS case is not selected for this site");
  }

  return {
    accessToken: token.accessToken,
    bisCaseId: siteRecord.bisCaseId,
    site: siteRecord,
    userId: user.id,
  };
}

export async function fetchBisAvailableCases(accessToken: string) {
  const response = await fetch(
    `${getBisBaseUrl()}/bisp/api/portal/bis_cases?page[number]=1&page[size]=200`,
    {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(
      json?.errors?.[0]?.detail || json?.error || "Failed to fetch BIS cases",
    );
  }

  return (Array.isArray(json?.data) ? json.data : []).map((item: any) => ({
    id: String(item?.id ?? ""),
    caseNumber:
      item?.attributes?.bis_case_number ?? item?.attributes?.case_number ?? null,
    constructionName:
      item?.attributes?.bis_case_name ??
      item?.attributes?.construction_name ??
      item?.attributes?.construction_board_name ??
      null,
    stageName: item?.attributes?.stage_name ?? null,
  }));
}

export async function exchangeBisAuthorizationCode(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getBisRedirectUri(),
  });

  const response = await fetch(`${getBisBaseUrl()}/bisp/api/auth/oauth2.0/token`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  const json = await response.json();

  if (!response.ok || !json?.access_token || !json?.refresh_token) {
    throw new Error(json?.error_description || json?.error || "Failed to exchange BIS authorization code");
  }

  return json as { access_token: string; refresh_token: string };
}
