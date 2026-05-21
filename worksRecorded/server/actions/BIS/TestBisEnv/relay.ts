const TEST_BIS_HOST = "test.bis.gov.lv";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function getHeaderValue(headers: HeadersInit | undefined, name: string) {
  if (!headers) return null;
  const normalizedName = name.toLowerCase();

  if (headers instanceof Headers) {
    return headers.get(name);
  }

  if (Array.isArray(headers)) {
    const match = headers.find(([key]) => key.toLowerCase() === normalizedName);
    return match?.[1] ?? null;
  }

  const record = headers as Record<string, string>;
  const key = Object.keys(record).find((item) => item.toLowerCase() === normalizedName);
  return key ? record[key] : null;
}

function shouldLogFullBisTokens() {
  return process.env.BIS_LOG_FULL_TOKENS === "true" || process.env.BIS_LOG_FULL_ACCESS_TOKEN === "true";
}

function maskAccessToken(token: string) {
  if (shouldLogFullBisTokens()) {
    return token;
  }

  if (token.length <= 16) {
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  }

  return `${token.slice(0, 8)}...${token.slice(-8)}`;
}

function logBisAccessTokenUsed(url: string, init?: RequestInit) {
  const authorization = getHeaderValue(init?.headers, "Authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match?.[1]) return;

  console.log("[BIS API] Access token used", {
    method: init?.method ?? "GET",
    url,
    accessToken: maskAccessToken(match[1]),
    fullTokensLogged: shouldLogFullBisTokens(),
  });
}

export function shouldUseBisRelay(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl);
  const isTestBis = normalized.includes(TEST_BIS_HOST);
  const isVercelRuntime = Boolean(process.env.VERCEL_ENV || process.env.VERCEL);

  return isTestBis && isVercelRuntime;
}

export function getBisRelayBaseUrl() {
  const relayUrl = process.env.BIS_TEST_ENV_RELAY_URL?.trim();
  if (!relayUrl) {
    throw new Error("BIS_TEST_ENV_RELAY_URL is required when using BIS test relay mode");
  }

  return relayUrl.replace(/\/+$/, "");
}

export async function bisFetch(baseUrl: string, url: string, init?: RequestInit) {
  logBisAccessTokenUsed(url, init);

  if (!shouldUseBisRelay(baseUrl)) {
    return fetch(url, init);
  }

  const relayUrl = new URL(`${getBisRelayBaseUrl()}/api/TestBisEnv/proxy`);
  relayUrl.searchParams.set("target", url);

  const headers = new Headers(init?.headers ?? {});
  const relaySecret = process.env.BIS_TEST_ENV_RELAY_SECRET?.trim();
  if (relaySecret) {
    headers.set("x-bis-relay-secret", relaySecret);
  }

  return fetch(relayUrl, {
    ...init,
    headers,
    cache: "no-store",
  });
}
