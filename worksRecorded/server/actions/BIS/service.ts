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
  return (
    process.env.BIS_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/bis/callback`
  );
}

function getBasicAuthHeader() {
  return `Basic ${Buffer.from(`${getBisClientId()}:${getBisClientSecret()}`).toString("base64")}`;
}

export async function getUserBisTokenByUserId(userId: string) {
  const rows = await prisma.$queryRawUnsafe<UserBisTokenRow[]>(
    'SELECT id, "accessToken", "refreshToken", "updatedAt", "userId" FROM "BisToken" WHERE "userId" = $1 ORDER BY "updatedAt" DESC LIMIT 1',
    userId,
  );

  return rows[0] ?? null;
}

export async function getCurrentUserBisToken() {
  const user = await requireUser();
  return getUserBisTokenByUserId(user.id);
}

export async function upsertUserBisToken(userId: string, accessToken: string, refreshToken: string) {
  await prisma.$executeRawUnsafe('DELETE FROM "BisToken" WHERE "userId" = $1', userId);
  await prisma.$executeRawUnsafe(
    'INSERT INTO "BisToken" (id, "accessToken", "refreshToken", "updatedAt", "userId") VALUES ($1, $2, $3, NOW(), $4)',
    crypto.randomUUID(),
    accessToken,
    refreshToken,
    userId,
  );
}

export async function deleteUserBisTokens(userId: string) {
  await prisma.$executeRawUnsafe('DELETE FROM "BisToken" WHERE "userId" = $1', userId);
}

export async function getSiteBisConfig(siteId: string) {
  const rows = await prisma.$queryRawUnsafe<SiteBisConfigRow[]>(
    'SELECT id, "bisCaseId", "bisCaseNumber", "bisCaseName", "bisCaseStage" FROM "Site" WHERE id = $1 LIMIT 1',
    siteId,
  );

  return rows[0] ?? null;
}

export async function setSiteBisConfig(siteId: string, config: Omit<SiteBisConfigRow, "id">) {
  await prisma.$executeRawUnsafe(
    'UPDATE "Site" SET "bisCaseId" = $2, "bisCaseNumber" = $3, "bisCaseName" = $4, "bisCaseStage" = $5 WHERE id = $1',
    siteId,
    config.bisCaseId,
    config.bisCaseNumber,
    config.bisCaseName,
    config.bisCaseStage,
  );
}

export async function requireBisAccessTokenForSite(siteId: string) {
  const user = await requireUser();
  const site = await orgCheck(user.id, siteId);

  if (!site) {
    throw new Error("Site not found");
  }

  const token = await getUserBisTokenByUserId(user.id);

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
    `${getBisBaseUrl()}/bisp/api/portal/authorizations/available_bis_cases?page[number]=1&page[size]=200`,
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
    caseNumber: item?.attributes?.case_number ?? null,
    constructionName: item?.attributes?.construction_name ?? null,
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
