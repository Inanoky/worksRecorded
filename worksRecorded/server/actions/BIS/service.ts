import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { bisFetch } from "./TestBisEnv/relay";

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
  bisConstructionRoundId: string | null;
  bisConstructionRoundName: string | null;
  bisConstructionRoundNumber: number | null;
  bisConstructionRoundStatus: string | null;
};

export type BisConstructionRoundOption = {
  id: string;
  name: string | null;
  roundNumber: number | null;
  status: string | null;
  label: string;
};

export type BisCaseOption = {
  id: string;
  caseNumber: string | null;
  constructionName: string | null;
  stageName: string | null;
};

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getJsonApiErrorMessage(payload: unknown, fallback: string) {
  if (!isJsonRecord(payload)) return fallback;
  const errors = payload.errors;
  if (Array.isArray(errors)) {
    const firstError = errors[0];
    if (isJsonRecord(firstError) && typeof firstError.detail === "string") {
      return firstError.detail;
    }
  }
  return typeof payload.error === "string" ? payload.error : fallback;
}

class BisTokenRefreshError extends Error {
  code: string;

  constructor(message: string, code = "BIS_REFRESH_FAILED") {
    super(message);
    this.name = "BisTokenRefreshError";
    this.code = code;
  }
}

const BIS_BASE_URL = (process.env.BIS_BASE_URL ?? "https://test.bis.gov.lv/").replace(/\/+$/, "");
const BIS_SCOPES = process.env.BIS_SCOPES ?? "bis_case_documents:manage logbooks:manage";
const BIS_ACCESS_TOKEN_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const WORKS_RECORDED_PRODUCTION_URL = "https://www.worksrecorded.com";

function shouldLogFullBisTokens() {
  return process.env.BIS_LOG_FULL_TOKENS === "true" || process.env.BIS_LOG_FULL_ACCESS_TOKEN === "true";
}

function maskBisToken(token: string | null | undefined) {
  if (!token) return null;

  if (shouldLogFullBisTokens()) {
    return token;
  }

  if (token.length <= 16) {
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  }

  return `${token.slice(0, 8)}...${token.slice(-8)}`;
}

function logBisTokenPair(
  label: string,
  token: { accessToken?: string | null; refreshToken?: string | null },
  context: Record<string, unknown> = {},
) {
  console.log(label, {
    ...context,
    accessToken: maskBisToken(token.accessToken),
    refreshToken: maskBisToken(token.refreshToken),
    fullTokensLogged: shouldLogFullBisTokens(),
  });
}

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

export function isBisHostedAuthorizationEnabled() {
  if (process.env.BIS_REDIRECT_URI) {
    return true;
  }

  return process.env.VERCEL_ENV === "production" || process.env.NEXT_PUBLIC_APP_URL === WORKS_RECORDED_PRODUCTION_URL;
}

export function getBisRedirectUri() {
  if (process.env.BIS_REDIRECT_URI) {
    return process.env.BIS_REDIRECT_URI;
  }

  if (isBisHostedAuthorizationEnabled()) {
    return `${WORKS_RECORDED_PRODUCTION_URL}/api/bis/callback`;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost:3000/";
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

async function getUserBisTokenRecordByUserId(userId: string) {
  const rows = await prisma.$queryRaw<UserBisTokenRow[]>`
    SELECT id, "accessToken", "refreshToken", "updatedAt", "userId"
    FROM "BisToken"
    WHERE "userId" = ${userId}
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getUserBisTokenByUserId(userId: string) {
  return ensureUserBisAccessToken(userId);
}

export async function getCurrentUserBisToken() {
  const user = await requireUser();
  return getUserBisTokenByUserId(user.id);
}

function isBisAccessTokenStale(token: UserBisTokenRow) {
  return Date.now() - new Date(token.updatedAt).getTime() >= BIS_ACCESS_TOKEN_MAX_AGE_MS;
}

export async function refreshBisAccessToken(userId: string, refreshToken: string) {
  console.log("[BIS API] Refresh token used", {
    userId,
    refreshToken: maskBisToken(refreshToken),
    fullTokensLogged: shouldLogFullBisTokens(),
  });

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await bisFetch(getBisBaseUrl(), `${getBisBaseUrl()}/bisp/api/auth/oauth2.0/token`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  const text = await response.text();
  let json: {
    access_token?: string;
    refresh_token?: string;
    error_description?: string;
    error?: string;
  } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new BisTokenRefreshError(
      `Failed to refresh BIS access token: token endpoint returned non-JSON response (status ${response.status}).`,
      "BIS_REFRESH_NON_JSON",
    );
  }

  if (!response.ok || !json?.access_token) {
    throw new BisTokenRefreshError(
      json?.error_description || json?.error || "Failed to refresh BIS access token",
      "BIS_REFRESH_REJECTED",
    );
  }

  const nextRefreshToken = json?.refresh_token || refreshToken;
  await upsertUserBisToken(userId, json.access_token, nextRefreshToken);

  logBisTokenPair("[BIS API] Refreshed token pair", {
    accessToken: String(json.access_token),
    refreshToken: String(nextRefreshToken),
  }, { userId });

  return {
    accessToken: String(json.access_token),
    refreshToken: String(nextRefreshToken),
  };
}

export async function ensureUserBisAccessToken(userId: string) {
  const token = await getUserBisTokenRecordByUserId(userId);

  if (!token) {
    return null;
  }

  if (!token.refreshToken) {
    if (!token.accessToken || isBisAccessTokenStale(token)) {
      return null;
    }
    logBisTokenPair("[BIS API] Stored token pair selected", token, { userId, hasRefreshToken: false });
    return token;
  }

  if (!token.accessToken || isBisAccessTokenStale(token)) {
    try {
      const refreshed = await refreshBisAccessToken(userId, token.refreshToken);
      return {
        ...token,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error("BIS token refresh failed, clearing stored BIS tokens", {
        userId,
        error,
      });

      await deleteUserBisTokens(userId);
      return null;
    }
  }

  logBisTokenPair("[BIS API] Stored token pair selected", token, { userId, hasRefreshToken: true });
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
    SELECT
      id,
      "bisCaseId",
      "bisCaseNumber",
      "bisCaseName",
      "bisCaseStage",
      "bisConstructionRoundId",
      "bisConstructionRoundName",
      "bisConstructionRoundNumber",
      "bisConstructionRoundStatus"
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
      "bisCaseStage" = ${config.bisCaseStage},
      "bisConstructionRoundId" = ${config.bisConstructionRoundId},
      "bisConstructionRoundName" = ${config.bisConstructionRoundName},
      "bisConstructionRoundNumber" = ${config.bisConstructionRoundNumber},
      "bisConstructionRoundStatus" = ${config.bisConstructionRoundStatus}
    WHERE id = ${siteId}
  `;
}

export async function setSiteBisConstructionRound(
  siteId: string,
  round: {
    id: string | null;
    name: string | null;
    roundNumber: number | null;
    status: string | null;
  },
) {
  await prisma.$executeRaw`
    UPDATE "Site"
    SET
      "bisConstructionRoundId" = ${round.id},
      "bisConstructionRoundName" = ${round.name},
      "bisConstructionRoundNumber" = ${round.roundNumber},
      "bisConstructionRoundStatus" = ${round.status}
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

  logBisTokenPair("[BIS API] Token pair selected for site workflow", token, {
    userId: user.id,
    siteId,
    bisCaseId: siteRecord.bisCaseId,
  });

  return {
    accessToken: token.accessToken,
    bisCaseId: siteRecord.bisCaseId,
    site: siteRecord,
    userId: user.id,
  };
}

export async function fetchBisAvailableCases(accessToken: string) {
  const response = await bisFetch(
    getBisBaseUrl(),
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
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    console.error("Failed to parse BIS cases response as JSON", {
      status: response.status,
      statusText: response.statusText,
      preview: text.slice(0, 300),
    });

    throw new Error(
      `BIS cases endpoint returned non-JSON response (status ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      getJsonApiErrorMessage(json, "Failed to fetch BIS cases"),
    );
  }

  const jsonRecord = isJsonRecord(json) ? json : {};
  const rows = Array.isArray(jsonRecord.data) ? jsonRecord.data : [];

  return rows
    .map((item) => {
      if (!isJsonRecord(item)) return null;
      const attributes = isJsonRecord(item.attributes) ? item.attributes : {};

      return {
        id: String(item.id ?? ""),
        caseNumber:
          attributes.bis_case_number == null && attributes.case_number == null
            ? null
            : String(attributes.bis_case_number ?? attributes.case_number),
        constructionName:
          attributes.bis_case_name == null &&
          attributes.construction_name == null &&
          attributes.construction_board_name == null
            ? null
            : String(
                attributes.bis_case_name ??
                attributes.construction_name ??
                attributes.construction_board_name,
              ),
        stageName: attributes.stage_name == null ? null : String(attributes.stage_name),
      };
    })
    .filter((item): item is BisCaseOption => Boolean(item?.id));
}

export async function fetchBisCaseConstructionRounds(
  accessToken: string,
  bisCaseId: string,
): Promise<BisConstructionRoundOption[]> {
  const response = await bisFetch(
    getBisBaseUrl(),
    `${getBisBaseUrl()}/bisp/api/portal/bis_cases/${encodeURIComponent(bisCaseId)}/construction_rounds?page[number]=1&page[size]=100`,
    {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  const text = await response.text();
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `BIS construction rounds endpoint returned non-JSON response (status ${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      getJsonApiErrorMessage(json, "Failed to fetch BIS construction rounds"),
    );
  }

  const jsonRecord = isJsonRecord(json) ? json : {};
  const rows = Array.isArray(jsonRecord.data) ? jsonRecord.data : [];

  return rows
    .map((item) => {
      if (!isJsonRecord(item)) return null;
      const id = String(item.id ?? "");
      const attributes = isJsonRecord(item.attributes) ? item.attributes : {};
      const name = attributes.name == null ? null : String(attributes.name);
      const roundNumber =
        attributes.round_number == null ? null : Number(attributes.round_number);
      const status = attributes.status == null ? null : String(attributes.status);
      const numberLabel = Number.isFinite(roundNumber) ? `${roundNumber}. ` : "";
      const label = `${numberLabel}${name || `Round ${id}`}${status ? ` (${status})` : ""}`;

      return {
        id,
        name,
        roundNumber: Number.isFinite(roundNumber) ? roundNumber : null,
        status,
        label,
      };
    })
    .filter((item): item is BisConstructionRoundOption => Boolean(item?.id));
}

export async function exchangeBisAuthorizationCode(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getBisRedirectUri(),
  });

  const response = await bisFetch(getBisBaseUrl(), `${getBisBaseUrl()}/bisp/api/auth/oauth2.0/token`, {
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
