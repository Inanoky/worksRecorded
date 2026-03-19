import { prisma } from "@/lib/utils/db";
import { BIS_BASE_URL, requireBisOAuthConfig } from "./config";
import { normalizeBisCase } from "./format";

const TOKEN_URL = `${BIS_BASE_URL}/services/auth/oauth2.0/token`;
const ACCESS_TOKEN_MAX_AGE_MS = 1000 * 60 * 45;

function basicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function refreshBisToken(force = false) {
  const latest = await prisma.bisToken.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!latest) {
    throw new Error("No BIS token found. Connect BIS first.");
  }

  if (!force && Date.now() - latest.updatedAt.getTime() < ACCESS_TOKEN_MAX_AGE_MS) {
    return latest.accessToken;
  }

  const { clientId, clientSecret } = requireBisOAuthConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: latest.refreshToken,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok || !json?.access_token) {
    throw new Error(json?.error_description || json?.error || "Failed to refresh BIS token");
  }

  await prisma.bisToken.update({
    where: { id: latest.id },
    data: {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? latest.refreshToken,
    },
  });

  return json.access_token as string;
}

export async function getBisAccessToken() {
  return refreshBisToken(false);
}

export async function bisFetch(path: string, init: RequestInit = {}) {
  let accessToken = await getBisAccessToken();

  const doFetch = async (token: string) =>
    fetch(`${BIS_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.api+json",
        ...((typeof init.body === "string" || init.body instanceof URLSearchParams) ? { "Content-Type": "application/vnd.api+json" } : {}),
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

  let response = await doFetch(accessToken);
  if (response.status === 401) {
    accessToken = await refreshBisToken(true);
    response = await doFetch(accessToken);
  }

  return response;
}

export async function listAuthorizedBisCases() {
  const response = await bisFetch("/bisp/api/portal/authorizations/available_bis_cases?page[number]=1&page[size]=200");
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.errors?.[0]?.detail || json?.error || "Failed to fetch BIS cases");
  }

  return (Array.isArray(json?.data) ? json.data : []).map(normalizeBisCase);
}
