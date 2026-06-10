import { logPerfEvent } from "@/lib/observability/perf";

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

function shouldLogVerboseBisApi() {
  return process.env.BIS_VERBOSE_LOGS === "true";
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

function parseResponseBodyForLog(text: string, contentType: string | null) {
  if (!text) return null;

  if (contentType?.toLowerCase().includes("json")) {
    try {
      return sanitizeBodyForLog(JSON.parse(text));
    } catch {
      return text;
    }
  }

  try {
    return sanitizeBodyForLog(JSON.parse(text));
  } catch {
    return text;
  }
}

function createBisRequestLogPayload(url: string, init?: RequestInit) {
  const authorization = getHeaderValue(init?.headers, "Authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  return {
    method: init?.method ?? "GET",
    url,
    headers: serializeHeadersForLog(init?.headers),
    body: serializeBodyForLog(init?.body),
    accessToken: match?.[1] ? maskAccessToken(match[1]) : null,
    fullTokensLogged: shouldLogFullBisTokens(),
  };
}

function getBisPerfTarget(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.host,
      path: sanitizeBisPath(parsed.pathname),
      pathGroup: getBisPathGroup(parsed.pathname),
    };
  } catch {
    const path = url.split("?")[0] || "unknown";
    return {
      host: "unknown",
      path: sanitizeBisPath(path),
      pathGroup: getBisPathGroup(path),
    };
  }
}

function sanitizeBisPath(path: string) {
  return path
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      if (/^\d+$/.test(segment)) return ":id";
      if (/^[0-9a-f-]{20,}$/i.test(segment)) return ":id";
      return segment;
    })
    .join("/");
}

function getBisPathGroup(path: string) {
  const normalizedPath = path.toLowerCase();

  if (normalizedPath.includes("/bisp/api/auth/oauth2.0/token")) {
    return "bis.auth.token";
  }

  if (normalizedPath.includes("/logbook/available_received_construction_products")) {
    return "bis.logbook.available_received_materials";
  }

  if (normalizedPath.includes("/logbook/available_used_materials")) {
    return "bis.logbook.available_used_materials";
  }

  if (normalizedPath.includes("/logbook/available_responsible_persons")) {
    return "bis.logbook.available_responsible_persons";
  }

  if (normalizedPath.includes("/logbook/received_construction_product_attachments")) {
    return "bis.material.received_product_attachments";
  }

  if (normalizedPath.includes("/logbook/received_construction_products")) {
    return "bis.material.received_products";
  }

  if (normalizedPath.includes("/logbook/construction_materials")) {
    return "bis.material.configurations";
  }

  if (normalizedPath.includes("/logbook/performed_works")) {
    return "bis.logbook.performed_works";
  }

  if (normalizedPath.includes("/logbook/shared_attached_document_attachments")) {
    return "bis.logbook.shared_attachments";
  }

  if (normalizedPath.includes("/logbook/")) {
    return "bis.logbook.other";
  }

  if (normalizedPath.includes("/classifiers")) {
    return "bis.classifiers";
  }

  if (normalizedPath.includes("/auth/oauth2.0/")) {
    return "bis.auth.other";
  }

  return "bis.other";
}

function getHeaderNumber(headers: Headers, name: string) {
  const value = headers.get(name);
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function logBisFetchPerf({
  requestId,
  url,
  init,
  startedAt,
  relayed,
  response,
  error,
}: {
  requestId: string;
  url: string;
  init?: RequestInit;
  startedAt: number;
  relayed: boolean;
  response?: Response;
  error?: unknown;
}) {
  const target = getBisPerfTarget(url);

  logPerfEvent({
    route: "bis.fetch",
    requestId,
    status: response?.status ?? 599,
    totalMs: Date.now() - startedAt,
    error,
    extra: {
      target: "bis",
      method: init?.method ?? "GET",
      host: target.host,
      path: target.path,
      pathGroup: target.pathGroup,
      relayed,
      ok: response?.ok ?? false,
      contentLength: response ? getHeaderNumber(response.headers, "content-length") : undefined,
    },
  });
}

async function logBisResponse(requestId: string, response: Response, startedAt: number) {
  if (!shouldLogVerboseBisApi()) return;

  const contentType = response.headers.get("content-type");
  let responseBody: unknown = null;

  try {
    responseBody = parseResponseBodyForLog(await response.clone().text(), contentType);
  } catch (error) {
    responseBody = {
      logError: error instanceof Error ? error.message : String(error),
    };
  }

  console.log("[BIS API] Response", JSON.stringify({
    requestId,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    durationMs: Date.now() - startedAt,
    headers: serializeHeadersForLog(response.headers),
    body: responseBody,
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
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const relayed = shouldUseBisRelay(baseUrl);

  if (shouldLogVerboseBisApi()) {
    console.log("[BIS API] Request", JSON.stringify({
      requestId,
      ...createBisRequestLogPayload(url, init),
    }, null, 2));
  }

  let response: Response;

  if (!relayed) {
    try {
      response = await fetch(url, init);
    } catch (error) {
      logBisFetchPerf({ requestId, url, init, startedAt, relayed, error });

      if (shouldLogVerboseBisApi()) {
        console.error("[BIS API] Network error", JSON.stringify({
          requestId,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        }, null, 2));
      }

      throw error;
    }

    logBisFetchPerf({ requestId, url, init, startedAt, relayed, response });
    await logBisResponse(requestId, response, startedAt);
    return response;
  }

  const relayUrl = new URL(`${getBisRelayBaseUrl()}/api/TestBisEnv/proxy`);
  relayUrl.searchParams.set("target", url);

  const headers = new Headers(init?.headers ?? {});
  const relaySecret = process.env.BIS_TEST_ENV_RELAY_SECRET?.trim();
  if (relaySecret) {
    headers.set("x-bis-relay-secret", relaySecret);
  }

  try {
    response = await fetch(relayUrl, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    logBisFetchPerf({ requestId, url, init, startedAt, relayed, error });

    if (shouldLogVerboseBisApi()) {
      console.error("[BIS API] Network error", JSON.stringify({
        requestId,
        relayUrl: relayUrl.toString(),
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
    }

    throw error;
  }

  logBisFetchPerf({ requestId, url, init, startedAt, relayed, response });
  await logBisResponse(requestId, response, startedAt);
  return response;
}
