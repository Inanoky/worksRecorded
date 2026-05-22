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

function maskAuthorizationHeader(value: string | null) {
  if (!value) return null;
  const bearerMatch = value.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch?.[1]) return `Bearer ${maskAccessToken(bearerMatch[1])}`;
  if (/^Basic\s+/i.test(value)) return "Basic <redacted>";
  return "<redacted>";
}

function serializeHeadersForLog(headers: HeadersInit | undefined) {
  if (!headers) return {};
  const normalized = new Headers(headers);
  const result: Record<string, string> = {};

  normalized.forEach((value, key) => {
    result[key] = key.toLowerCase() === "authorization"
      ? maskAuthorizationHeader(value) ?? "<redacted>"
      : value;
  });

  return result;
}

function sanitizeBodyForLog(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    const normalizedKey = key.toLowerCase();
    if (
      !shouldLogFullBisTokens() &&
      (normalizedKey.includes("token") || normalizedKey.includes("secret"))
    ) {
      return maskAccessToken(value);
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeBodyForLog(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeBodyForLog(entryValue, entryKey),
      ]),
    );
  }

  return value;
}

function serializeBodyForLog(body: BodyInit | null | undefined) {
  if (!body) return null;

  if (typeof body === "string") {
    try {
      return sanitizeBodyForLog(JSON.parse(body));
    } catch {
      return body;
    }
  }

  if (body instanceof URLSearchParams) {
    return sanitizeBodyForLog(Object.fromEntries(body.entries()));
  }

  if (body instanceof FormData) {
    return Array.from(body.entries()).map(([name, value]) => {
      if (typeof value === "string") {
        return { name, value };
      }

      return {
        name,
        fileName: value.name || "blob",
        type: value.type || "application/octet-stream",
        size: value.size,
      };
    });
  }

  if (body instanceof Blob) {
    return {
      type: body.type || "application/octet-stream",
      size: body.size,
    };
  }

  return `[${body.constructor?.name || "unserializable body"}]`;
}

function logBisRequest(url: string, init?: RequestInit) {
  const authorization = getHeaderValue(init?.headers, "Authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  console.log("[BIS API] Request", JSON.stringify({
    method: init?.method ?? "GET",
    url,
    headers: serializeHeadersForLog(init?.headers),
    body: serializeBodyForLog(init?.body),
    accessToken: match?.[1] ? maskAccessToken(match[1]) : null,
    fullTokensLogged: shouldLogFullBisTokens(),
  }, null, 2));
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
  logBisRequest(url, init);

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
